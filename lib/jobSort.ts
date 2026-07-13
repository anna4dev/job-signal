export type JobSortMode = "newest" | "pay" | "fit";

export const JOB_SORT_OPTIONS: { label: string; value: JobSortMode }[] = [
  { label: "Newest", value: "newest" },
  { label: "Highest Pay", value: "pay" },
  { label: "Best Fit", value: "fit" },
];

/** Candidates fetched for client-side Best Fit scoring (recent matching pool). */
export const FIT_CANDIDATE_LIMIT = 100;

export function parseJobSortMode(raw: string | undefined | null): JobSortMode {
  if (raw === "pay" || raw === "fit" || raw === "newest") return raw;
  return "newest";
}

const LAST_SORT_KEY = "job_signal_last_sort_v1";

/** Remember list sort for detail-page fit events (session-scoped). */
export function rememberJobSortMode(mode: JobSortMode): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LAST_SORT_KEY, mode);
  } catch {
    /* private mode / quota */
  }
}

export function getRememberedJobSortMode(): JobSortMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_SORT_KEY);
    if (raw === "pay" || raw === "fit" || raw === "newest") return raw;
  } catch {
    /* ignore */
  }
  return null;
}
