import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/** Append-only company-page observability events. Schema managed in Turso (see README). */

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_EVENTS_PER_ANON_DAY = 2000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_COMPANY_ID_LEN = 128;
const MAX_JOB_ID_LEN = 128;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENT_TYPES = new Set([
  "page_view",
  "job_click",
  "bookmark_add",
  "bookmark_remove",
  "apply_click",
]);

/** Narrow unknown values to non-empty trimmed strings. */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** True when `error` is a JSON parse SyntaxError. */
function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError;
}

/** Read a numeric column from a DB row object. */
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

/**
 * Read the request body with a hard byte cap (streaming), so chunked uploads
 * cannot exceed MAX_BODY_BYTES in memory.
 */
async function readBodyWithByteLimit(
  req: Request,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false };
    }
  }

  const reader = req.body?.getReader();
  if (!reader) return { ok: true, text: "" };

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore cancel errors */
      }
      return { ok: false };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

/** Normalize and validate a single inbound company event, or return null. */
function normalizeEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.event_type !== "string" || !EVENT_TYPES.has(obj.event_type)) {
    return null;
  }
  if (!isNonEmptyString(obj.company_id)) return null;

  const companyId = obj.company_id.trim();
  if (companyId.length > MAX_COMPANY_ID_LEN) return null;

  const isPageView = obj.event_type === "page_view";
  let jobId: string | null = null;
  if (isNonEmptyString(obj.job_id)) {
    const trimmed = obj.job_id.trim();
    if (trimmed.length > MAX_JOB_ID_LEN) return null;
    jobId = trimmed;
  } else if (!isPageView) {
    return null;
  }

  let position: number | null = null;
  if (typeof obj.position === "number" && Number.isFinite(obj.position)) {
    position = Math.max(0, Math.min(10_000, Math.round(obj.position)));
  }

  return {
    company_id: companyId,
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
  let body: unknown;
  try {
    const limited = await readBodyWithByteLimit(req, MAX_BODY_BYTES);
    if (!limited.ok) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    body = limited.text ? JSON.parse(limited.text) : null;
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

    /** job_id -> owning company_id */
    const jobCompany = new Map<string, string>();
    const jobIds = Array.from(
      new Set(
        accepted
          .map((e) => e.job_id)
          .filter((id): id is string => typeof id === "string" && !!id),
      ),
    );
    if (jobIds.length > 0) {
      const jobPlaceholders = jobIds.map(() => "?").join(",");
      const jobCheck = await db.execute({
        sql: `SELECT job_id, company_id FROM jobs_structured WHERE job_id IN (${jobPlaceholders})`,
        args: jobIds,
      });
      for (const row of jobCheck.rows) {
        const r = row as Record<string, unknown>;
        jobCompany.set(String(r.job_id), String(r.company_id));
      }
    }

    const filtered = accepted.filter((event) => {
      if (!knownCompanies.has(event.company_id)) return false;
      if (!event.job_id) return true;
      const owner = jobCompany.get(event.job_id);
      return owner === event.company_id;
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
