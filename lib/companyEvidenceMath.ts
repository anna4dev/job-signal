import type { CompanyEvidence, CompanyMomentum } from "@/types/company";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Count timestamps in the half-open interval [startMs, endMs). */
function countInRange(
  times: number[],
  startMs: number,
  endMs: number,
): number {
  return times.filter((t) => t >= startMs && t < endMs).length;
}

/** Pure 30/90-day momentum from post timestamps (ms). */
export function computeCompanyMomentum(
  postTimes: number[],
  nowMs: number = Date.now(),
): CompanyMomentum {
  const d30 = nowMs - 30 * MS_DAY;
  const d60 = nowMs - 60 * MS_DAY;
  const d90 = nowMs - 90 * MS_DAY;
  const d180 = nowMs - 180 * MS_DAY;

  const jobs30d = countInRange(postTimes, d30, nowMs + 1);
  const jobs90d = countInRange(postTimes, d90, nowMs + 1);
  const jobsPrev30d = countInRange(postTimes, d60, d30);
  const jobsPrev90d = countInRange(postTimes, d180, d90);

  const delta30d =
    jobs30d === 0 && jobsPrev30d === 0 ? null : jobs30d - jobsPrev30d;
  const delta90d =
    jobs90d === 0 && jobsPrev90d === 0 ? null : jobs90d - jobsPrev90d;

  return {
    jobs30d,
    jobs90d,
    jobsPrev30d,
    jobsPrev90d,
    delta30d,
    delta90d,
  };
}

/** Short anomaly / coverage hints for the Trend zone. */
export function buildCompanyEvidenceHints(
  momentum: CompanyMomentum,
  sampleSize: number,
  coverage: CompanyEvidence["coverage"],
): string[] {
  const hints: string[] = [];
  if (sampleSize === 0) {
    hints.push("No structured HN jobs linked to this company yet.");
    return hints;
  }

  if (momentum.jobs30d === 0 && momentum.jobs90d > 0) {
    hints.push(
      "No posts in the last 30 days (still active in the 90-day window).",
    );
  } else if (momentum.jobs90d === 0 && sampleSize > 0) {
    hints.push("No posts in the last 90 days — hiring signal may be stale.");
  }

  if (momentum.delta30d != null && momentum.delta30d >= 2) {
    hints.push("30-day posting pace is up vs the prior 30 days.");
  } else if (momentum.delta30d != null && momentum.delta30d <= -2) {
    hints.push("30-day posting pace is down vs the prior 30 days.");
  }

  if (coverage.salary != null && coverage.salary < 30) {
    hints.push("Low salary disclosure — treat pay signals as sparse.");
  }
  if (coverage.techStack != null && coverage.techStack < 30) {
    hints.push("Sparse job-level tech stack coverage.");
  }

  return hints.slice(0, 4);
}
