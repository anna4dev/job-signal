import type { SavedSearchItem } from "@/hooks/useSavedSearches";
import type { ExplicitProfile, ProfileSuggestion } from "@/types/profile";

/**
 * Phase 2.1 final-minimal assist-fill.
 *
 * Derives field-level suggestions from saved searches only.
 * V1 supports exactly two fields:
 *   - `preferences.skills`         ← `filters.stack`
 *   - `hardConstraints.work.modes` ← all-remote saved searches
 *
 * Hard rules:
 *   - Pure function, zero API/side effects.
 *   - Capabilities are NEVER inferred (skills / seniority must be self-declared).
 *   - No suggestion for visa / salary / oncall / seniority / industries / sizes / fundingStages.
 *   - Skips suggestions whose values already exist on the profile (case-insensitive for skills).
 *   - Returns [] when nothing useful to surface.
 */
export function getSuggestions(
  savedSearches: SavedSearchItem[],
  profile: ExplicitProfile,
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];

  // ── preferences.skills ← filters.stack (split + trim + dedupe) ────────────
  const stackBag = new Set<string>();
  for (const s of savedSearches) {
    const stack = s.filters.stack;
    if (!stack) continue;
    for (const raw of stack.split(",")) {
      const v = raw.trim();
      if (v) stackBag.add(v);
    }
  }

  if (stackBag.size > 0) {
    const existingLower = new Set(
      profile.preferences.skills.map((s) => s.value.toLowerCase()),
    );
    const fresh = Array.from(stackBag).filter(
      (v) => !existingLower.has(v.toLowerCase()),
    );
    if (fresh.length > 0) {
      suggestions.push({
        field: "preferences.skills",
        values: fresh,
        reason: "From your saved searches",
      });
    }
  }

  // ── hardConstraints.work.modes ← ≥2 saved searches all `remote=true` ──────
  const allRemote =
    savedSearches.length >= 2 &&
    savedSearches.every((s) => s.filters.remote === "true");
  const alreadyHasRemote =
    profile.hardConstraints.work.modes.includes("remote");

  if (allRemote && !alreadyHasRemote) {
    suggestions.push({
      field: "hardConstraints.work.modes",
      values: ["remote"],
      reason: "From your saved searches",
    });
  }

  return suggestions;
}
