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

async function ensureTable() {
  await db.execute(ensureTableSQL);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
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

    const id = randomUUID();

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
  } catch (e) {
    console.error("job-corrections error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

