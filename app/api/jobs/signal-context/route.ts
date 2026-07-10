import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTechStackField } from "@/lib/parseJobFields";
import type { BookmarkJobSignalContext } from "@/types/signals";

const MAX_JOB_IDS = 200;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function rowString(row: unknown, key: string): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError;
}

/** Minimal job + company payload for bookmark-derived implicit signals. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    if (isJsonSyntaxError(error)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("jobs/signal-context error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  try {
    const rawIds = (body as { job_ids?: unknown } | null)?.job_ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ jobs: [] as BookmarkJobSignalContext[] });
    }

    const jobIds = rawIds
      .filter(isNonEmptyString)
      .map((id) => id.trim())
      .slice(0, MAX_JOB_IDS);

    if (jobIds.length === 0) {
      return NextResponse.json({ jobs: [] as BookmarkJobSignalContext[] });
    }

    const placeholders = jobIds.map(() => "?").join(",");
    const result = await db.execute({
      sql: `
        SELECT
          j.job_id,
          j.role_title,
          j.tech_stack,
          c.industry,
          c.size,
          c.funding_stage
        FROM jobs_structured j
        JOIN company_structured c ON j.company_id = c.company_id
        WHERE j.job_id IN (${placeholders})
      `,
      args: jobIds,
    });

    const jobs: BookmarkJobSignalContext[] = result.rows.map((row) => ({
      job_id: rowString(row, "job_id") ?? "",
      role_title: rowString(row, "role_title") ?? "",
      tech_stack: parseTechStackField(
        (row as Record<string, unknown>).tech_stack,
      ),
      industry: rowString(row, "industry") ?? null,
      size: rowString(row, "size") ?? null,
      funding_stage: rowString(row, "funding_stage") ?? null,
    }));

    return NextResponse.json({ jobs: jobs.filter((j) => j.job_id) });
  } catch (e) {
    console.error("jobs/signal-context error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
