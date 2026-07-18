import { isCompanyIndexable, toYearMonth } from "@/lib/companyIndexable";
import { parseTechStackField } from "@/lib/parseJobFields";
import {
  buildCompanyEvidenceHints,
  computeCompanyMomentum,
} from "@/lib/companyEvidenceMath";
import type { CompanyJobAggregateRow } from "@/lib/companyJobRows";
import type { CompanyEvidence, CompanyQuickStats } from "@/types/company";

const TOP_STACK = 12;
const TOP_LEVELS = 8;
const QUICK_TOP_LEVELS = 4;

/** Percent share of `n` over `total`, or null when total is empty. */
export function shareOf(n: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((n / total) * 100);
}

/**
 * Pure Quick Decision stats from preloaded job rows (no DB I/O).
 */
export function buildCompanyQuickStatsFromRows(
  rows: CompanyJobAggregateRow[],
  companyName: string,
): CompanyQuickStats {
  const jobCount = rows.length;
  const postingMonths = rows
    .map((r) => toYearMonth(r.post_at))
    .filter((m): m is string => !!m);

  const remoteCount = rows.filter((r) => r.location_remote === 1).length;
  const visaCount = rows.filter((r) => r.location_visa_supported === 1).length;
  const salaryCount = rows.filter(
    (r) => r.salary_min != null || r.salary_max != null,
  ).length;

  const levelMap = new Map<string, number>();
  for (const r of rows) {
    const level = r.level || "unknown";
    levelMap.set(level, (levelMap.get(level) || 0) + 1);
  }
  const topLevels = Array.from(levelMap.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, QUICK_TOP_LEVELS);

  const postTimes = rows
    .map((r) => r.post_at)
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

  return {
    jobCount,
    openRolesSample: Math.min(jobCount, 50),
    remoteShare: shareOf(remoteCount, jobCount),
    visaShare: shareOf(visaCount, jobCount),
    salaryCoverage: shareOf(salaryCount, jobCount),
    topLevels,
    postingMonths: Array.from(new Set(postingMonths)).sort(),
    firstPostAt,
    lastPostAt,
    indexable: isCompanyIndexable({
      companyName,
      jobCount,
      postingMonths,
    }),
  };
}

/**
 * Pure Phase B evidence aggregates from preloaded job rows (no DB I/O).
 * Shared by production `getCompanyEvidence` and unit tests.
 */
export function buildCompanyEvidenceFromRows(
  rows: CompanyJobAggregateRow[],
  companySource: string | null,
  nowMs: number = Date.now(),
): CompanyEvidence {
  const sampleSize = rows.length;

  const postTimes = rows
    .map((r) => r.post_at)
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
        .map((r) => toYearMonth(r.post_at))
        .filter((m): m is string => !!m),
    ),
  ).sort();

  const remoteCount = rows.filter((r) => r.location_remote === 1).length;
  const visaCount = rows.filter((r) => r.location_visa_supported === 1).length;
  const salaryCount = rows.filter(
    (r) => r.salary_min != null || r.salary_max != null,
  ).length;

  let knownLevelCount = 0;
  let techStackJobCount = 0;
  const levelMap = new Map<string, number>();
  const stackMap = new Map<string, number>();

  for (const r of rows) {
    const level = r.level || "unknown";
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
      share: shareOf(count, sampleSize) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LEVELS);

  const jobTechStack = Array.from(stackMap.entries())
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count || a.tech.localeCompare(b.tech))
    .slice(0, TOP_STACK);

  const coverage = {
    remote: shareOf(remoteCount, sampleSize),
    visa: shareOf(visaCount, sampleSize),
    salary: shareOf(salaryCount, sampleSize),
    techStack: shareOf(techStackJobCount, sampleSize),
    level: shareOf(knownLevelCount, sampleSize),
  };

  const momentum = computeCompanyMomentum(postTimes, nowMs);
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
}
