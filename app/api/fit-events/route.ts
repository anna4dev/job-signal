import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/** Append-only fit observability events. Schema managed in Turso (see README). */

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_EVENTS_PER_ANON_DAY = 2000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENT_TYPES = new Set([
  "impression",
  "open",
  "bookmark_add",
  "bookmark_remove",
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
  job_id: string;
  event_type: string;
  fit_score: number | null;
  hard_fail: number;
  sort_mode: string | null;
  position: number | null;
};

function normalizeEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isNonEmptyString(obj.job_id)) return null;
  if (typeof obj.event_type !== "string" || !EVENT_TYPES.has(obj.event_type)) {
    return null;
  }

  let fitScore: number | null = null;
  if (typeof obj.fit_score === "number" && Number.isFinite(obj.fit_score)) {
    fitScore = Math.max(0, Math.min(100, Math.round(obj.fit_score)));
  }

  let position: number | null = null;
  if (typeof obj.position === "number" && Number.isFinite(obj.position)) {
    position = Math.max(0, Math.min(10_000, Math.round(obj.position)));
  }

  const sortMode =
    typeof obj.sort_mode === "string" && obj.sort_mode.trim()
      ? obj.sort_mode.trim().slice(0, 32)
      : null;

  return {
    job_id: obj.job_id.trim(),
    event_type: obj.event_type,
    fit_score: fitScore,
    hard_fail: obj.hard_fail === true || obj.hard_fail === 1 ? 1 : 0,
    sort_mode: sortMode,
    position,
  };
}

/**
 * Batch ingest natural-behavior fit events for monitoring / calibration.
 * Does not update fit weights or UnifiedSignals.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    if (isJsonSyntaxError(error)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("fit-events error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  try {
    const record = (body as Record<string, unknown>) || {};
    const anonymous_id = record.anonymous_id;
    const rawEvents = record.events;

    if (!isNonEmptyString(anonymous_id) || !UUID_RE.test(anonymous_id)) {
      return NextResponse.json(
        { error: "invalid anonymous_id" },
        { status: 400 },
      );
    }
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return NextResponse.json(
        { error: "events array is required" },
        { status: 400 },
      );
    }

    const events = rawEvents
      .slice(0, MAX_EVENTS_PER_REQUEST)
      .map(normalizeEvent)
      .filter((e): e is IncomingEvent => e !== null);

    if (events.length === 0) {
      return NextResponse.json(
        { error: "no valid events" },
        { status: 400 },
      );
    }

    const countRes = await db.execute({
      sql: `
        SELECT COUNT(*) AS cnt FROM fit_events
        WHERE anonymous_id = ?
          AND created_at >= datetime('now', '-1 day')
      `,
      args: [anonymous_id],
    });
    if (rowNumber(countRes.rows[0], "cnt") + events.length > MAX_EVENTS_PER_ANON_DAY) {
      return NextResponse.json(
        { error: "Too many events" },
        { status: 429 },
      );
    }

    const jobIds = Array.from(new Set(events.map((e) => e.job_id)));
    const placeholders = jobIds.map(() => "?").join(",");
    const jobRes = await db.execute({
      sql: `SELECT job_id FROM jobs_structured WHERE job_id IN (${placeholders})`,
      args: jobIds,
    });
    const validJobs = new Set(
      jobRes.rows
        .map((row) => {
          if (!row || typeof row !== "object") return "";
          const id = (row as Record<string, unknown>).job_id;
          return typeof id === "string" ? id : "";
        })
        .filter(Boolean),
    );

    const accepted = events.filter((e) => validJobs.has(e.job_id));
    if (accepted.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    // libsql supports batch; insert row-by-row for simplicity and clear errors.
    let inserted = 0;
    for (const event of accepted) {
      await db.execute({
        sql: `
          INSERT INTO fit_events (
            id, anonymous_id, job_id, event_type,
            fit_score, hard_fail, sort_mode, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          randomUUID(),
          anonymous_id,
          event.job_id,
          event.event_type,
          event.fit_score,
          event.hard_fail,
          event.sort_mode,
          event.position,
        ],
      });
      inserted += 1;
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    console.error("fit-events error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
