import type {
  Weighted,
  ID,
  ImplicitSignals,
  Preferences,
  Rejections,
  UnifiedSignals,
  ExplicitProfile,
} from "@/types/profile";
import type { BookmarkItem } from "@/types/job";
import type { SavedSearchItem } from "@/hooks/useSavedSearches";

// ── Constants ─────────────────────────────────────────────────────────────────

// implicit contribution coefficient: explicit always dominates
const ALPHA = 0.3;

const DEFAULT_HALF_LIFE_DAYS = 30;

// ── ID canonicalization ──────────────────────────────────────────────────────
// Free-text inputs admit casing/whitespace variants ("React" vs "react"). All
// merge / rejection-conflict logic must compare on the canonical form, otherwise
// soft rejections silently fail to remove preferred skills.
function canonicalId(v: string): string {
  return v.trim().toLowerCase();
}

// ── 1. applyDecay ─────────────────────────────────────────────────────────────
// Exponential time decay: weight halves every halfLifeDays days.
// Prevents stale behavior from permanently biasing recommendations.
export function applyDecay(
  signals: ImplicitSignals,
  now: number,
): ImplicitSignals {
  const ageDays = (now - signals.lastUpdatedAt) / 86_400_000;
  const factor = Math.pow(0.5, ageDays / signals.decay.halfLifeDays);

  function decayList<T>(items: Weighted<T>[] | undefined): Weighted<T>[] | undefined {
    if (!items) return undefined;
    return items.map((i) => ({ ...i, weight: i.weight * factor }));
  }

  return {
    ...signals,
    inferredPreferences: {
      roles: decayList(signals.inferredPreferences.roles),
      skills: decayList(signals.inferredPreferences.skills),
      industries: decayList(signals.inferredPreferences.industries),
    },
    decay: { ...signals.decay, computedAt: now },
  };
}

// ── 2. normalizeWeights ───────────────────────────────────────────────────────
// Per-dimension normalization so sum(weight)=1.
// Called only inside mergePreferences — never inside fit().
export function normalizeWeights<T>(items: Weighted<T>[]): Weighted<T>[] {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return items;
  return items.map((i) => ({ ...i, weight: i.weight / total }));
}

// ── 3. mergePreferences ───────────────────────────────────────────────────────
// Steps: groupBy(value) → weight merge → normalize → remove rejection conflicts.
// RULE: explicit dominates; implicit only augments.
// RULE: w = min(1, w_explicit + ALPHA * w_implicit)
// RULE: Rejections.soft conflicts are removed from the merged preferences.
export function mergePreferences(
  explicit: Preferences,
  implicit: ImplicitSignals["inferredPreferences"],
  rejections: Rejections,
): Preferences {
  function mergeList(
    explicitList: Weighted<ID>[],
    implicitList: Weighted<ID>[] | undefined,
    rejectedIds: Set<string>,
  ): Weighted<ID>[] {
    // Step 1: groupBy(canonicalId(value)) — use canonical key, preserve first-seen value
    const map = new Map<string, Weighted<ID>>();

    for (const item of explicitList) {
      map.set(canonicalId(item.value), { ...item, source: "explicit" });
    }

    for (const item of implicitList ?? []) {
      const key = canonicalId(item.value);
      const existing = map.get(key);
      if (existing) {
        // explicit item exists: small augmentation, capped at 1
        map.set(key, {
          ...existing,
          weight: Math.min(1, existing.weight + ALPHA * item.weight),
        });
      } else {
        // new item from implicit: downweighted introduction
        map.set(key, {
          value: item.value,
          weight: ALPHA * item.weight,
          source: "implicit",
        });
      }
    }

    // Step 2: remove items that appear in rejections (conflict priority)
    // Compare via canonical IDs so "React" preference + "react" soft rejection
    // resolve to the same key.
    const merged = Array.from(map.values()).filter(
      (item) => !rejectedIds.has(canonicalId(item.value)),
    );

    // Step 3: normalize per-dimension
    return normalizeWeights(merged);
  }

  const rejectedSkillIds = new Set(
    (rejections.soft.skills ?? []).map((s) => canonicalId(s.value)),
  );

  return {
    roles: mergeList(explicit.roles, implicit.roles, new Set()),
    skills: mergeList(explicit.skills, implicit.skills, rejectedSkillIds),
    industries: mergeList(explicit.industries, implicit.industries, new Set()),
    companySizes: normalizeWeights(explicit.companySizes),
    fundingStages: normalizeWeights(explicit.fundingStages),
    workMode: explicit.workMode
      ? normalizeWeights(explicit.workMode)
      : undefined,
    salary: explicit.salary,
  };
}

// ── 4. extractImplicitSignals ─────────────────────────────────────────────────
// Derives ImplicitSignals from Phase 1 data.
//   - bookmarks → behaviorMetrics (count, applyRate). Job-attribute extraction
//     (skills/industries) requires job detail joins and is deferred to Phase 2.2+.
//   - savedSearches → inferredPreferences.skills (frequency of `filters.stack`,
//     normalized to 0..1).
//
// Returns inferredPreferences.skills only when ≥1 stack value exists. Roles /
// industries / etc. are intentionally not inferred (saved-search filters do
// not carry that data, and capabilities are never inferred).
export function extractImplicitSignals(
  bookmarks: BookmarkItem[],
  savedSearches: SavedSearchItem[],
): ImplicitSignals {
  const bookmarkCount = bookmarks.length;
  const appliedCount = bookmarks.filter(
    (b) => b.status === "Applied" || b.status === "Interviewing" || b.status === "Offer",
  ).length;
  const applyRate = bookmarkCount > 0 ? appliedCount / bookmarkCount : 0;

  // Frequency-weighted skill signals from saved-search stack filters.
  // Map keyed by canonical id; preserves first-seen casing as the value.
  const skillCounts = new Map<string, { value: string; count: number }>();
  for (const s of savedSearches) {
    const stack = s.filters.stack;
    if (!stack) continue;
    for (const raw of stack.split(",")) {
      const v = raw.trim();
      if (!v) continue;
      const key = canonicalId(v);
      const entry = skillCounts.get(key);
      if (entry) entry.count++;
      else skillCounts.set(key, { value: v, count: 1 });
    }
  }

  let skills: Weighted<ID>[] | undefined;
  if (skillCounts.size > 0) {
    const maxCount = Math.max(
      ...Array.from(skillCounts.values()).map((e) => e.count),
    );
    skills = Array.from(skillCounts.values()).map((e) => ({
      value: e.value,
      weight: e.count / maxCount,
      source: "implicit" as const,
    }));
  }

  return {
    inferredPreferences: skills ? { skills } : {},
    behaviorMetrics: { bookmarkCount, applyRate },
    decay: {
      halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
      computedAt: Date.now(),
    },
    lastUpdatedAt: Date.now(),
  };
}

// ── 5. computeUnifiedSignals ──────────────────────────────────────────────────
// Main entry point for Phase 2.2+.
// Call order: applyDecay → mergePreferences (groupBy + normalize + conflict-resolve)
// INVARIANT: returned UnifiedSignals.preferences is pre-normalized (sum=1 per dimension).
export function computeUnifiedSignals(
  explicit: ExplicitProfile,
  bookmarks: BookmarkItem[],
  savedSearches: SavedSearchItem[],
): UnifiedSignals {
  const now = Date.now();
  const rawImplicit = extractImplicitSignals(bookmarks, savedSearches);
  const decayedImplicit = applyDecay(rawImplicit, now);

  const mergedPreferences = mergePreferences(
    explicit.preferences,
    decayedImplicit.inferredPreferences,
    explicit.rejections,
  );

  return {
    version: "1",
    updatedAt: now,
    hardConstraints: explicit.hardConstraints,
    capabilities: explicit.capabilities,
    preferences: mergedPreferences,
    rejections: explicit.rejections,
    implicit: decayedImplicit,
  };
}

// ── FactorKey → job field mapping (Phase 2.3 / Phase 3 explainability) ────────
export const FACTOR_FIELD_MAP = {
  visa_constraint: "location_visa_supported",
  work_mode_constraint: "work_style",
  location_constraint: "location_country",
  employment_type_constraint: "work_style",
  hard_rejection_industry: "industry",
  hard_rejection_company: "company_id",
  capability_skill_match: "required_skills",
  capability_level_match: "level",
  preference_role_match: "role_title",
  preference_skill_match: "tech_stack",
  preference_industry_match: "industry",
  preference_company_size_match: "size",
  preference_funding_stage_match: "funding_stage",
  preference_work_mode_match: "work_style",
  preference_salary_match: "salary_min",
  soft_rejection_oncall: "responsibilities",
  soft_rejection_skill: "tech_stack",
  soft_rejection_company_type: "size",
} as const;
