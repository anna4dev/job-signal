import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const ensureTableSQL = `
  CREATE TABLE IF NOT EXISTS job_corrections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    job_raw_id TEXT NOT NULL,
    user_id TEXT,
    anonymous_id TEXT NOT NULL,
    field TEXT NOT NULL,
    correction_type TEXT NOT NULL CHECK (
      correction_type IN ('overwrite','add','remove')
    ),
    original_value TEXT,
    corrected_value TEXT NOT NULL,
    evidence_span TEXT,
    agent_verdict TEXT DEFAULT 'PENDING' CHECK (
      agent_verdict IN ('PENDING','AGREE','DISAGREE','UNCERTAIN')
    ),
    agent_confidence REAL,
    agent_reason TEXT,
    model_version TEXT,
    job_version_tag TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs_structured(job_id),
    FOREIGN KEY (job_raw_id) REFERENCES jobs_raw(id)
  );
`;

/** Turso-managed: idx_job_corrections_idempotency (see README Database Schema). */
const IDEMPOTENCY_INDEX = "idx_job_corrections_idempotency";

/** Max distinct correction rows per anonymous user per job (abuse guard). */
const MAX_CORRECTIONS_PER_JOB = 10;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureTable() {
  await db.execute(ensureTableSQL);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function rowString(row: unknown, key: string): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function rowNumber(row: unknown, key: string): number {
  if (!row || typeof row !== "object") return 0;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : Number(value) || 0;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = record.code;
  if (code === "SQLITE_CONSTRAINT" || code === "SQLITE_CONSTRAINT_UNIQUE") {
    return true;
  }
  const message =
    typeof record.message === "string" ? record.message : String(error);
  return (
    /unique constraint failed/i.test(message) ||
    /SQLITE_CONSTRAINT(_UNIQUE)?/i.test(message)
  );
}

async function findExistingCorrectionId(
  args: readonly [string, string, string, string, string],
): Promise<string | undefined> {
  const existingRes = await db.execute({
    sql: `
      SELECT id FROM job_corrections
      WHERE anonymous_id = ?
        AND job_id = ?
        AND field = ?
        AND correction_type = ?
        AND corrected_value = ?
      LIMIT 1
    `,
    args: [...args],
  });
  return rowString(existingRes.rows[0], "id");
}

export async function POST(req: Request) {
  try {
    await ensureTable();

    const body = await req.json();

    const {
      job_id,
      job_raw_id,
      anonymous_id,
      field,
      correction_type,
      corrected_value,
      original_value,
    } = body || {};

    if (!isNonEmptyString(job_id)) {
      return NextResponse.json(
        { error: "job_id is required" },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(job_raw_id)) {
      return NextResponse.json(
        { error: "job_raw_id is required" },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(anonymous_id)) {
      return NextResponse.json(
        { error: "anonymous_id is required" },
        { status: 400 },
      );
    }
    if (!UUID_RE.test(anonymous_id)) {
      return NextResponse.json(
        { error: "invalid anonymous_id" },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(field)) {
      return NextResponse.json(
        { error: "field is required" },
        { status: 400 },
      );
    }

    if (
      correction_type !== "overwrite" &&
      correction_type !== "add" &&
      correction_type !== "remove"
    ) {
      return NextResponse.json(
        { error: "invalid correction_type" },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(corrected_value)) {
      return NextResponse.json(
        { error: "corrected_value is required" },
        { status: 400 },
      );
    }

    const originalValueStr =
      original_value === undefined || original_value === null
        ? null
        : String(original_value);

    // Validate referenced rows exist.
    const jobRes = await db.execute({
      sql: "SELECT 1 FROM jobs_structured WHERE job_id = ? LIMIT 1",
      args: [job_id],
    });
    if (!jobRes.rows[0]) {
      return NextResponse.json(
        { error: "job_id not found" },
        { status: 404 },
      );
    }

    const rawRes = await db.execute({
      sql: "SELECT 1 FROM jobs_raw WHERE id = ? LIMIT 1",
      args: [job_raw_id],
    });
    if (!rawRes.rows[0]) {
      return NextResponse.json(
        { error: "job_raw_id not found" },
        { status: 404 },
      );
    }

    const idempotencyArgs = [
      anonymous_id,
      job_id,
      field,
      correction_type,
      corrected_value,
    ] as const;

    const existingId = await findExistingCorrectionId(idempotencyArgs);
    if (existingId) {
      return NextResponse.json({ ok: true, id: existingId, duplicate: true });
    }

    const countRes = await db.execute({
      sql: `
        SELECT COUNT(*) AS cnt FROM job_corrections
        WHERE anonymous_id = ? AND job_id = ?
      `,
      args: [anonymous_id, job_id],
    });
    if (rowNumber(countRes.rows[0], "cnt") >= MAX_CORRECTIONS_PER_JOB) {
      return NextResponse.json({ error: "Too many corrections" }, { status: 429 });
    }

    const id = randomUUID();

    try {
      await db.execute({
        sql: `
          INSERT INTO job_corrections (
            id,
            job_id,
            job_raw_id,
            anonymous_id,
            field,
            correction_type,
            original_value,
            corrected_value
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          job_id,
          job_raw_id,
          anonymous_id,
          field,
          correction_type,
          originalValueStr,
          corrected_value,
        ],
      });
      return NextResponse.json({ ok: true, id });
    } catch (insertError) {
      if (!isUniqueConstraintError(insertError)) throw insertError;

      const conflictId = await findExistingCorrectionId(idempotencyArgs);
      if (conflictId) {
        return NextResponse.json({
          ok: true,
          id: conflictId,
          duplicate: true,
        });
      }

      console.error(
        `job-corrections: ${IDEMPOTENCY_INDEX} violation but row not found`,
        insertError,
      );
      throw insertError;
    }
  } catch (e) {
    console.error("job-corrections error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

