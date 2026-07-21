import { toYearMonth } from "@/lib/companyIndexable";
import { shareOf } from "@/lib/companyAggregates";
import type { CompanyJobAggregateRow } from "@/lib/companyJobRows";
import type {
  CompanySignalConsistency,
  CompanyTrajectoryMonth,
} from "@/types/company";

/** Dominant level label in a row set, or null when empty. */
function topLevelOf(rows: CompanyJobAggregateRow[]): string | null {
  if (rows.length === 0) return null;
  const map = new Map<string, number>();
  for (const r of rows) {
    const level = r.level || "unknown";
    map.set(level, (map.get(level) || 0) + 1);
  }
  let best: string | null = null;
  let bestCount = -1;
  for (const [level, count] of map) {
    if (count > bestCount) {
      best = level;
      bestCount = count;
    }
  }
  return best;
}

/** Absolute percentage-point gap between two optional shares. */
function shareDelta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

/**
 * Build a month-bucketed hiring trajectory from job rows (newest months last).
 */
export function buildCompanyTrajectory(
  rows: CompanyJobAggregateRow[],
): CompanyTrajectoryMonth[] {
  const byMonth = new Map<string, CompanyJobAggregateRow[]>();
  for (const r of rows) {
    const month = toYearMonth(r.post_at);
    if (!month) continue;
    const list = byMonth.get(month) ?? [];
    list.push(r);
    byMonth.set(month, list);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthRows]) => {
      const remoteCount = monthRows.filter((r) => r.location_remote === 1)
        .length;
      const salaryCount = monthRows.filter(
        (r) => r.salary_min != null || r.salary_max != null,
      ).length;
      return {
        month,
        jobCount: monthRows.length,
        remoteShare: shareOf(remoteCount, monthRows.length),
        salaryCoverage: shareOf(salaryCount, monthRows.length),
        topLevel: topLevelOf(monthRows),
      };
    });
}

/**
 * Compare early vs late halves of posting history for signal stability.
 * Pure helper — used by getCompanyLongHorizon and unit tests.
 */
export function buildCompanySignalConsistency(
  rows: CompanyJobAggregateRow[],
): CompanySignalConsistency {
  const sorted = [...rows]
    .filter((r) => r.post_at)
    .sort((a, b) => {
      const ta = new Date(a.post_at!).getTime();
      const tb = new Date(b.post_at!).getTime();
      return ta - tb;
    });

  if (sorted.length < 4) {
    return {
      score: sorted.length === 0 ? 0 : 50,
      remoteEarly: null,
      remoteLate: null,
      salaryEarly: null,
      salaryLate: null,
      visaEarly: null,
      visaLate: null,
      topLevelEarly: topLevelOf(sorted),
      topLevelLate: topLevelOf(sorted),
      notes:
        sorted.length === 0
          ? ["Not enough structured posts to judge signal consistency."]
          : [
              "Fewer than 4 posts — consistency is a weak estimate until history grows.",
            ],
    };
  }

  const mid = Math.floor(sorted.length / 2);
  const early = sorted.slice(0, mid);
  const late = sorted.slice(mid);

  const coverage = (part: CompanyJobAggregateRow[]) => {
    const n = part.length;
    return {
      remote: shareOf(
        part.filter((r) => r.location_remote === 1).length,
        n,
      ),
      salary: shareOf(
        part.filter((r) => r.salary_min != null || r.salary_max != null).length,
        n,
      ),
      visa: shareOf(
        part.filter((r) => r.location_visa_supported === 1).length,
        n,
      ),
      topLevel: topLevelOf(part),
    };
  };

  const e = coverage(early);
  const l = coverage(late);

  const deltas = [
    shareDelta(e.remote, l.remote),
    shareDelta(e.salary, l.salary),
    shareDelta(e.visa, l.visa),
  ].filter((d): d is number => d != null);

  const levelShift =
    e.topLevel && l.topLevel && e.topLevel !== l.topLevel ? 25 : 0;
  const avgDelta =
    deltas.length > 0
      ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length
      : 0;
  // Map avg pp gap (0–100) + level shift into a stability score.
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - avgDelta - levelShift)),
  );

  const notes: string[] = [];
  if (shareDelta(e.remote, l.remote) != null && shareDelta(e.remote, l.remote)! >= 20) {
    notes.push(
      `Remote share shifted from ${e.remote}% (earlier posts) to ${l.remote}% (later posts).`,
    );
  }
  if (shareDelta(e.salary, l.salary) != null && shareDelta(e.salary, l.salary)! >= 20) {
    notes.push(
      `Salary disclosure shifted from ${e.salary}% to ${l.salary}%.`,
    );
  }
  if (e.topLevel && l.topLevel && e.topLevel !== l.topLevel) {
    notes.push(
      `Dominant level moved from ${e.topLevel} to ${l.topLevel} across the history split.`,
    );
  }
  if (notes.length === 0) {
    notes.push(
      "Remote, visa, salary disclosure, and dominant level look relatively stable across early vs late posts.",
    );
  }

  return {
    score,
    remoteEarly: e.remote,
    remoteLate: l.remote,
    salaryEarly: e.salary,
    salaryLate: l.salary,
    visaEarly: e.visa,
    visaLate: l.visa,
    topLevelEarly: e.topLevel,
    topLevelLate: l.topLevel,
    notes: notes.slice(0, 4),
  };
}
