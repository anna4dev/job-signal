/**
 * Company page indexing gate (Phase A SEO).
 *
 * Indexable when ALL of:
 * 1. jobCount > 2
 * 2. Cross-month: distinct YYYY-MM of post_at > 1
 * 3. nonAdjacentMonthPostCount > 2 — months that have at least one other
 *    posting month at calendar distance ≥ 2 (not just a consecutive run)
 *
 * Anonymous / placeholder names are never indexable.
 */

const PLACEHOLDER_NAME_RE =
  /^(anonymous|stealth|confidential|unknown|n\/a|na|none|\?+|-+|\.+)$/i;

export function isAnonymousCompanyName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_NAME_RE.test(trimmed);
}

/** YYYY-MM → months since epoch (stable for adjacency). */
export function yearMonthToIndex(ym: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

export function toYearMonth(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Count of distinct posting months that have at least one other posting
 * month at |Δmonths| ≥ 2.
 */
export function countNonAdjacentMonthPosts(postingMonths: string[]): number {
  const indices = Array.from(
    new Set(
      postingMonths
        .map(yearMonthToIndex)
        .filter((n): n is number => n !== null),
    ),
  ).sort((a, b) => a - b);

  if (indices.length < 2) return 0;

  let count = 0;
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    let hasNonAdjacent = false;
    for (let j = 0; j < indices.length; j++) {
      if (i === j) continue;
      if (Math.abs(indices[j] - cur) >= 2) {
        hasNonAdjacent = true;
        break;
      }
    }
    if (hasNonAdjacent) count += 1;
  }
  return count;
}

export type CompanyIndexStats = {
  companyName: string | null | undefined;
  jobCount: number;
  /** Distinct or raw YYYY-MM values from job post_at. */
  postingMonths: string[];
};

export function isCompanyIndexable(stats: CompanyIndexStats): boolean {
  if (isAnonymousCompanyName(stats.companyName)) return false;
  if (stats.jobCount <= 2) return false;

  const distinctMonths = Array.from(
    new Set(
      stats.postingMonths
        .map((m) => m.trim())
        .filter((m) => yearMonthToIndex(m) !== null),
    ),
  );
  if (distinctMonths.length <= 1) return false;

  return countNonAdjacentMonthPosts(distinctMonths) > 2;
}
