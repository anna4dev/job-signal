/**
 * Format a salary number from jobs_structured.
 * Values may be full USD (e.g. 120000) or already in thousands (e.g. 120).
 */
export function formatSalaryAmount(val: number): string {
  if (val >= 1000) {
    return `${Math.round(val / 1000)}k`;
  }
  return `${Math.round(val)}`;
}

/** Range label like `$30k - $120k` or `$30 - $120`. Null when both ends missing/invalid. */
export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  const hasMin = typeof min === "number" && Number.isFinite(min) && min > 0;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max > 0;
  if (!hasMin && !hasMax) return null;

  if (hasMin && hasMax) {
    if (min === max) return `$${formatSalaryAmount(min)}`;
    return `$${formatSalaryAmount(min)} - $${formatSalaryAmount(max)}`;
  }
  if (hasMin) return `$${formatSalaryAmount(min!)}+`;
  return `Up to $${formatSalaryAmount(max!)}`;
}
