import { cache } from "react";
import { db } from "@/lib/db";

/** Raw job fields needed for company quick stats + Phase B evidence. */
export type CompanyJobAggregateRow = {
  job_id: string;
  level: string;
  location_remote: number;
  location_visa_supported: number;
  salary_min: number | null;
  salary_max: number | null;
  post_at: string | null;
  tech_stack: unknown;
};

/** Coerce unknown DB values to string (empty when nullish). */
function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/** Coerce unknown DB values to string or null. */
function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return String(value);
}

/** Coerce unknown DB values to a finite number (0 when invalid). */
function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Load all structured jobs for a company once per request.
 * Shared by getCompanyQuickStats and getCompanyEvidence via React.cache.
 */
export const loadCompanyJobAggregateRows = cache(
  async function loadCompanyJobAggregateRows(
    companyId: string,
  ): Promise<CompanyJobAggregateRow[]> {
    const result = await db.execute({
      sql: `
        SELECT
          job_id,
          level,
          location_remote,
          location_visa_supported,
          salary_min,
          salary_max,
          post_at,
          tech_stack
        FROM jobs_structured
        WHERE company_id = ?
        ORDER BY post_at DESC
      `,
      args: [companyId],
    });

    return (result.rows as Record<string, unknown>[]).map((r) => ({
      job_id: asString(r.job_id),
      level: asString(r.level) || "unknown",
      location_remote: asNumber(r.location_remote),
      location_visa_supported: asNumber(r.location_visa_supported),
      salary_min: r.salary_min == null ? null : asNumber(r.salary_min),
      salary_max: r.salary_max == null ? null : asNumber(r.salary_max),
      post_at: asNullableString(r.post_at),
      tech_stack: r.tech_stack,
    }));
  },
);
