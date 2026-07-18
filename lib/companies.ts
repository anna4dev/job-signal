import { cache } from "react";
import { db } from "@/lib/db";
import { isCompanyIndexable } from "@/lib/companyIndexable";
import { buildCompanyQuickStatsFromRows } from "@/lib/companyAggregates";
import { loadCompanyJobAggregateRows } from "@/lib/companyJobRows";
import { asNullableString, asNumber, asString } from "@/lib/dbCoerce";
import type {
  CompanyDetail,
  CompanyJobSnapshot,
  CompanyListItem,
  CompanyQuickStats,
} from "@/types/company";

/** Parse a GROUP_CONCAT months CSV into a trimmed string list. */
function parseMonthsCsv(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type CompanyAggRow = {
  company_id: string;
  company_name: string;
  industry: string | null;
  size: string | null;
  funding_stage: string | null;
  job_count: number;
  last_post_at: string | null;
  posting_months: string[];
};

/** Aligns with common `isAnonymousCompanyName` placeholders (SQL pre-filter). */
const SQL_PLACEHOLDER_NAMES = [
  "anonymous",
  "stealth",
  "confidential",
  "unknown",
  "n/a",
  "na",
  "none",
] as const;

/** Short TTL so list + sitemap share work without unbounded per-request scans. */
const AGGREGATE_TTL_MS = 5 * 60 * 1000;
let aggregateSnapshot: { at: number; rows: CompanyAggRow[] } | null = null;

/**
 * Load companies that already pass cheap SQL gates (job_count > 2, >1 posting
 * month, non-placeholder name). Full indexability (non-adjacent months) is
 * applied in memory. Snapshot is TTL-cached across requests.
 */
async function loadCompanyAggregates(): Promise<CompanyAggRow[]> {
  const now = Date.now();
  if (
    aggregateSnapshot &&
    now - aggregateSnapshot.at < AGGREGATE_TTL_MS
  ) {
    return aggregateSnapshot.rows;
  }

  const placeholders = SQL_PLACEHOLDER_NAMES.map(() => "?").join(",");
  const result = await db.execute({
    sql: `
      SELECT
        c.company_id,
        c.company_name,
        c.industry,
        c.size,
        c.funding_stage,
        COUNT(j.job_id) AS job_count,
        MAX(j.post_at) AS last_post_at,
        GROUP_CONCAT(DISTINCT strftime('%Y-%m', j.post_at)) AS posting_months
      FROM company_structured c
      INNER JOIN jobs_structured j ON j.company_id = c.company_id
      WHERE TRIM(c.company_name) != ''
        AND LOWER(TRIM(c.company_name)) NOT IN (${placeholders})
      GROUP BY c.company_id
      HAVING COUNT(j.job_id) > 2
        AND COUNT(DISTINCT strftime('%Y-%m', j.post_at)) > 1
      ORDER BY MAX(j.post_at) DESC
    `,
    args: [...SQL_PLACEHOLDER_NAMES],
  });

  const rows = result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      company_id: asString(r.company_id),
      company_name: asString(r.company_name),
      industry: asNullableString(r.industry),
      size: asNullableString(r.size),
      funding_stage: asNullableString(r.funding_stage),
      job_count: asNumber(r.job_count),
      last_post_at: asNullableString(r.last_post_at),
      posting_months: parseMonthsCsv(r.posting_months),
    };
  });

  aggregateSnapshot = { at: now, rows };
  return rows;
}

/**
 * Paginated list of indexable companies (SEO gate), optionally filtered by q.
 */
export async function listIndexableCompanies(opts: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<{ total: number; companies: CompanyListItem[] }> {
  const page = Math.max(1, opts.page);
  const pageSize = Math.max(1, Math.min(50, opts.pageSize));
  const q = (opts.q || "").trim().toLowerCase();

  const aggs = await loadCompanyAggregates();
  const indexable = aggs.filter((row) =>
    isCompanyIndexable({
      companyName: row.company_name,
      jobCount: row.job_count,
      postingMonths: row.posting_months,
    }),
  );

  const filtered = q
    ? indexable.filter(
        (row) =>
          row.company_name.toLowerCase().includes(q) ||
          (row.industry || "").toLowerCase().includes(q),
      )
    : indexable;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const companies: CompanyListItem[] = filtered
    .slice(start, start + pageSize)
    .map((row) => ({
      company_id: row.company_id,
      company_name: row.company_name,
      industry: row.industry,
      size: row.size,
      funding_stage: row.funding_stage,
      job_count: row.job_count,
      last_post_at: row.last_post_at
        ? new Date(row.last_post_at).toISOString().slice(0, 10)
        : null,
    }));

  return { total, companies };
}

/** Indexable company ids + last_modified for sitemap generation. */
export async function listIndexableCompanyIdsForSitemap(limit = 500): Promise<
  { company_id: string; last_modified: Date }[]
> {
  const aggs = await loadCompanyAggregates();
  const indexable = aggs.filter((row) =>
    isCompanyIndexable({
      companyName: row.company_name,
      jobCount: row.job_count,
      postingMonths: row.posting_months,
    }),
  );

  return indexable.slice(0, limit).map((row) => ({
    company_id: row.company_id,
    last_modified: row.last_post_at
      ? new Date(row.last_post_at)
      : new Date(),
  }));
}

/** Company profile row from company_structured (cached per request). */
export const getCompanyDetail = cache(async function getCompanyDetail(
  companyId: string,
): Promise<CompanyDetail | null> {
  const result = await db.execute({
    sql: `
      SELECT
        company_id,
        company_name,
        company_description,
        industry,
        confidence,
        source,
        source_links,
        size,
        funding_stage,
        total_funding_usd,
        tech_stack,
        culture_keywords,
        enrichment_status,
        created_at,
        updated_at
      FROM company_structured
      WHERE company_id = ?
    `,
    args: [companyId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    company_id: asString(row.company_id),
    company_name: asString(row.company_name),
    company_description: asNullableString(row.company_description),
    industry: asNullableString(row.industry),
    confidence: asNullableString(row.confidence),
    source: asNullableString(row.source),
    source_links: asNullableString(row.source_links),
    size: asNullableString(row.size),
    funding_stage: asNullableString(row.funding_stage),
    total_funding_usd:
      row.total_funding_usd == null ? null : asNumber(row.total_funding_usd),
    tech_stack: asNullableString(row.tech_stack),
    culture_keywords: asNullableString(row.culture_keywords),
    enrichment_status: asNullableString(row.enrichment_status),
    created_at: asNullableString(row.created_at),
    updated_at: asNullableString(row.updated_at),
  };
});

/** Recent jobs for a company detail jobs zone (includes jd_url for apply). */
export async function getCompanyJobs(
  companyId: string,
  limit = 50,
): Promise<CompanyJobSnapshot[]> {
  const result = await db.execute({
    sql: `
      SELECT
        job_id,
        role_title,
        level,
        location_city,
        location_country,
        location_remote,
        location_visa_supported,
        salary_min,
        salary_max,
        post_at,
        tech_stack,
        jd_url
      FROM jobs_structured
      WHERE company_id = ?
      ORDER BY post_at DESC
      LIMIT ?
    `,
    args: [companyId, limit],
  });

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const postAt = asNullableString(r.post_at) || "";
    return {
      job_id: asString(r.job_id),
      role_title: asString(r.role_title),
      level: asString(r.level),
      location_city: asNullableString(r.location_city),
      location_country: asNullableString(r.location_country),
      location_remote: asNumber(r.location_remote),
      location_visa_supported: asNumber(r.location_visa_supported),
      salary_min: r.salary_min == null ? null : asNumber(r.salary_min),
      salary_max: r.salary_max == null ? null : asNumber(r.salary_max),
      post_at: postAt ? new Date(postAt).toISOString().slice(0, 10) : postAt,
      tech_stack: asNullableString(r.tech_stack),
      jd_url: asNullableString(r.jd_url),
    };
  });
}

/**
 * Quick Decision stats for a company page. Reuses the cached job-row fetch
 * shared with getCompanyEvidence.
 */
export const getCompanyQuickStats = cache(async function getCompanyQuickStats(
  companyId: string,
  companyName: string,
): Promise<CompanyQuickStats> {
  const rows = await loadCompanyJobAggregateRows(companyId);
  return buildCompanyQuickStatsFromRows(rows, companyName);
});
