/**
 * Filter canonical skill/tech chip names by query.
 * Matches display substring and normalized aliases (nodejs → Node.js).
 */

import { normalizeSkillKey } from "@/lib/fitNormalize";
import { canonicalizeSkillsForProfile } from "@/lib/profileVocabulary";

export function filterCanonicalSkillNames(
  names: string[],
  q: string,
  limit = 10,
): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const queryKeys = new Set(
    [
      normalizeSkillKey(q),
      ...canonicalizeSkillsForProfile(q).map(normalizeSkillKey),
    ].filter(Boolean),
  );
  return names
    .filter((name) => {
      if (name.toLowerCase().includes(needle)) return true;
      return queryKeys.has(normalizeSkillKey(name));
    })
    .slice(0, limit);
}

export function filterCanonicalSkillSuggestions(
  stats: Array<{ name: string }>,
  q: string,
  limit = 10,
): string[] {
  return filterCanonicalSkillNames(
    stats.map((s) => s.name),
    q,
    limit,
  );
}
