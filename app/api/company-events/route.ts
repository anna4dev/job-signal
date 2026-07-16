import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/** Append-only company-page observability events. Schema managed in Turso (see README). */

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_EVENTS_PER_ANON_DAY = 2000;
const MAX_BODY_BYTES = 64 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENT_TYPES = new Set([
  "page_view",
  "job_click",
  "bookmark_add",
  "bookmark_remove",
  "apply_click",
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError;
}

function rowNumber(row: unknown, key: string): number {
  if (!row || typeof row !== "object") return 0;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : Number(value) || 0;
}

type IncomingEvent = {
  company_id: string;
  job_id: string | null;
  event_type: string;
  position: number | null;
};

function normalizeEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.event_type !== "string" || !EVENT_TYPES.has(obj.event_type)) {
    return null;
  }
  if (!isNonEmptyString(obj.company_id)) return null;

  const isPageView = obj.event_type === "page_view";
  let jobId: string | null = null;
  if (isNonEmptyString(obj.job_id)) {
    jobId = obj.job_id.trim();
  } else if (!isPageView) {
    return null;
  }

  let position: number | null = null;
  if (typeof obj.position === "number" && Number.isFinite(obj.position)) {
    position = Math.max(0, Math.min(10_000, Math.round(obj.position)));
  }

  return {
    company_id: obj.company_id.trim().slice(0, 128),
    job_id: jobId,
    event_type: obj.event_type,
    position,
  };
}

/**
 * Batch ingest company-page behavior events for Phase B exit metrics
 * (second-click, bookmark/apply from company pages). Monitoring only.
 */
export async function POST(req: Request) {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    if (isJsonSyntaxError(error)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("company-events error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  try {
    const record = (body as Record<string, unknown>) || {};
    const anonymous_id =
      typeof record.anonymous_id === "string" ? record.anonymous_id.trim() : "";
    if (!UUID_RE.test(anonymous_id)) {
      return NextResponse.json(
        { error: "Invalid anonymous_id" },
        { status: 400 },
      );
    }

    const rawEvents = Array.isArray(record.events) ? record.events : [];
    if (rawEvents.length === 0 || rawEvents.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: "events must be a non-empty array (max 50)" },
        { status: 400 },
      );
    }

    const accepted: IncomingEvent[] = [];
    for (const raw of rawEvents) {
      const event = normalizeEvent(raw);
      if (event) accepted.push(event);
    }
    if (accepted.length === 0) {
      return NextResponse.json({ error: "No valid events" }, { status: 400 });
    }

    // Soft abuse guard only: client-rotatable anonymous_id + count-then-insert TOCTOU.
    const dayCountResult = await db.execute({
      sql: `
        SELECT COUNT(*) AS cnt
        FROM company_events
        WHERE anonymous_id = ?
          AND created_at >= datetime('now', '-1 day')
      `,
      args: [anonymous_id],
    });
    const dayCount = rowNumber(dayCountResult.rows[0], "cnt");
    if (dayCount + accepted.length > MAX_EVENTS_PER_ANON_DAY) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const companyIds = Array.from(
      new Set(accepted.map((e) => e.company_id)),
    );
    const companyPlaceholders = companyIds.map(() => "?").join(",");
    const companyCheck = await db.execute({
      sql: `SELECT company_id FROM company_structured WHERE company_id IN (${companyPlaceholders})`,
      args: companyIds,
    });
    const knownCompanies = new Set(
      companyCheck.rows.map((row) =>
        String((row as Record<string, unknown>).company_id),
      ),
    );

    const jobIds = Array.from(
      new Set(
        accepted
          .map((e) => e.job_id)
          .filter((id): id is string => typeof id === "string" && !!id),
      ),
    );
    const knownJobs = new Set<string>();
    if (jobIds.length > 0) {
      const jobPlaceholders = jobIds.map(() => "?").join(",");
      const jobCheck = await db.execute({
        sql: `SELECT job_id FROM jobs_structured WHERE job_id IN (${jobPlaceholders})`,
        args: jobIds,
      });
      for (const row of jobCheck.rows) {
        knownJobs.add(String((row as Record<string, unknown>).job_id));
      }
    }

    const filtered = accepted.filter((event) => {
      if (!knownCompanies.has(event.company_id)) return false;
      if (event.job_id && !knownJobs.has(event.job_id)) return false;
      return true;
    });
    if (filtered.length === 0) {
      return NextResponse.json(
        { error: "No events with known company/job ids" },
        { status: 400 },
      );
    }

    const insertSql = `
      INSERT INTO company_events (
        id, anonymous_id, company_id, job_id, event_type, position
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.batch(
      filtered.map((event) => ({
        sql: insertSql,
        args: [
          randomUUID(),
          anonymous_id,
          event.company_id,
          event.job_id,
          event.event_type,
          event.position,
        ],
      })),
      "write",
    );

    return NextResponse.json({ ok: true, inserted: filtered.length });
  } catch (error) {
    console.error("company-events error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
