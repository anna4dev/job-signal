import { cache } from "react";
import { db } from "@/lib/db";
import { toYearMonth } from "@/lib/companyIndexable";
import { parseTechStackField } from "@/lib/parseJobFields";
import {
  buildCompanyEvidenceHints,
  computeCompanyMomentum,
} from "@/lib/companyEvidenceMath";
import type { CompanyEvidence } from "@/types/company";

const TOP_STACK = 12;
const TOP_LEVELS = 8;

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return String(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function share(n: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((n / total) * 100);
}

/**
 * Evidence aggregates for company detail Phase B zones (momentum, coverage,
 * level mix, job-derived stack). Cached per request with React.cache.
 */
export const getCompanyEvidence = cache(async function getCompanyEvidence(
  companyId: string,
  companySource: string | null,
): Promise<CompanyEvidence> {
  const result = await db.execute({
    sql: `
      SELECT
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

  const rows = result.rows as Record<string, unknown>[];
  const sampleSize = rows.length;

  const postTimes = rows
    .map((r) => asNullableString(r.post_at))
    .filter((v): v is string => !!v)
    .map((v) => new Date(v).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const firstPostAt =
    postTimes.length > 0 ? new Date(postTimes[0]).toISOString() : null;
  const lastPostAt =
    postTimes.length > 0
      ? new Date(postTimes[postTimes.length - 1]).toISOString()
      : null;

  const postingMonths = Array.from(
    new Set(
      rows
        .map((r) => toYearMonth(asNullableString(r.post_at)))
        .filter((m): m is string => !!m),
    ),
  ).sort();

  const remoteCount = rows.filter((r) => asNumber(r.location_remote) === 1)
    .length;
  const visaCount = rows.filter(
    (r) => asNumber(r.location_visa_supported) === 1,
  ).length;
  const salaryCount = rows.filter(
    (r) => r.salary_min != null || r.salary_max != null,
  ).length;

  let knownLevelCount = 0;
  let techStackJobCount = 0;
  const levelMap = new Map<string, number>();
  const stackMap = new Map<string, number>();

  for (const r of rows) {
    const level = asString(r.level) || "unknown";
    if (level !== "unknown") knownLevelCount += 1;
    levelMap.set(level, (levelMap.get(level) || 0) + 1);

    const stack = parseTechStackField(r.tech_stack);
    if (stack.length > 0) {
      techStackJobCount += 1;
      for (const tech of stack) {
        const key = tech.trim();
        if (!key) continue;
        stackMap.set(key, (stackMap.get(key) || 0) + 1);
      }
    }
  }

  const levelMix = Array.from(levelMap.entries())
    .map(([level, count]) => ({
      level,
      count,
      share: share(count, sampleSize) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LEVELS);

  const jobTechStack = Array.from(stackMap.entries())
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count || a.tech.localeCompare(b.tech))
    .slice(0, TOP_STACK);

  const coverage = {
    remote: share(remoteCount, sampleSize),
    visa: share(visaCount, sampleSize),
    salary: share(salaryCount, sampleSize),
    techStack: share(techStackJobCount, sampleSize),
    level: share(knownLevelCount, sampleSize),
  };

  const momentum = computeCompanyMomentum(postTimes, Date.now());
  const sourceLabel =
    (companySource || "").trim() || "Hacker News Who's Hiring";

  return {
    sampleSize,
    windowLabel: "All tracked HN Who's Hiring posts for this company",
    firstPostAt,
    lastPostAt,
    postingMonthCount: postingMonths.length,
    sources: [sourceLabel],
    coverage,
    levelMix,
    jobTechStack,
    momentum,
    hints: buildCompanyEvidenceHints(momentum, sampleSize, coverage),
  };
});
