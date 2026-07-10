function normalizeStringItems(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out;
}

/** Parse jobs_structured.tech_stack JSON (or pre-parsed arrays) into string[]. */
export function parseTechStackField(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return normalizeStringItems(raw);
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeStringItems(parsed);
  } catch {
    return [];
  }
}
