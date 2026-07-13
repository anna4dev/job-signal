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
