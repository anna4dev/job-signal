/** Coerce unknown DB values to string (empty when nullish). */
export function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/** Coerce unknown DB values to string or null. */
export function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return String(value);
}

/** Coerce unknown DB values to a finite number (0 when invalid). */
export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
