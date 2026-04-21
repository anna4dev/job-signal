/**
 * Normalize a filter set so no-op values are stripped:
 *   - `page` (pagination, orthogonal to what's being filtered)
 *   - `min_salary=0` (slider default)
 *   - whitespace-only `q`
 *   - any empty-string value
 *
 * Keys are sorted so the returned `URLSearchParams` stringifies deterministically.
 *
 * Single source of truth for "are these two filter sets equivalent?"—used by
 * FilterBar (save-button enable state, save payload) and by useSavedSearches
 * (duplicate detection inside saveSearch).
 */
export function canonicalizeFilters(
  input: string | URLSearchParams | Record<string, string>,
): URLSearchParams {
  const p = new URLSearchParams(input);
  p.delete("page");

  const q = p.get("q")?.trim() ?? "";
  if (q) p.set("q", q);
  else p.delete("q");

  if (p.get("min_salary") === "0") p.delete("min_salary");

  for (const key of Array.from(p.keys())) {
    if (!p.get(key)) p.delete(key);
  }
  p.sort();
  return p;
}

/** Stable string key for equality comparisons between filter sets. */
export function filterSnapshotKey(
  input: string | URLSearchParams | Record<string, string>,
): string {
  return canonicalizeFilters(input).toString();
}
