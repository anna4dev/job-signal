import type {
  Weighted,
  ID,
  ImplicitSignals,
  Preferences,
  Rejections,
  UnifiedSignals,
  ExplicitProfile,
} from "@/types/profile";
import type { BookmarkItem, BookmarkStatus } from "@/types/job";
import type { SavedSearchItem } from "@/hooks/useSavedSearches";
import type { BookmarkJobSignalContext } from "@/types/signals";
export { FACTOR_FIELD_MAP, factorJobField } from "@/lib/factorMap";
export type { FactorJobField } from "@/lib/factorMap";

// ── Constants ─────────────────────────────────────────────────────────────────

// implicit contribution coefficient: explicit always dominates
const ALPHA = 0.3;

const DEFAULT_HALF_LIFE_DAYS = 30;

const APPLIED_STATUSES: BookmarkStatus[] = [
  "Applied",
  "Interviewing",
  "Offer",
];

// ── ID canonicalization ──────────────────────────────────────────────────────
// Free-text inputs admit casing/whitespace variants ("React" vs "react"). All
// merge / rejection-conflict logic must compare on the canonical form, otherwise
// soft rejections silently fail to remove preferred skills.
function canonicalId(v: string): string {
  return v.trim().toLowerCase();
}

function bookmarkSignalWeight(status?: BookmarkStatus): number {
  if (status && APPLIED_STATUSES.includes(status)) return 2;
  return 1;
}

type CountEntry = { value: string; count: number };

function addWeightedCount(
  map: Map<string, CountEntry>,
  raw: string | null | undefined,
  weight: number,
): void {
  const v = raw?.trim();
  if (!v || weight <= 0) return;
  const key = canonicalId(v);
  const entry = map.get(key);
  if (entry) entry.count += weight;
  else map.set(key, { value: v, count: weight });
}

function countsToFrequencyWeights(
  map: Map<string, CountEntry>,
): Weighted<ID>[] | undefined {
  if (map.size === 0) return undefined;
  const maxCount = Math.max(...Array.from(map.values()).map((e) => e.count));
  if (maxCount <= 0) return undefined;
  return Array.from(map.values()).map((e) => ({
    value: e.value,
    weight: e.count / maxCount,
    source: "implicit" as const,
  }));
}

// ── 1. applyDecay ─────────────────────────────────────────────────────────────
// Exponential time decay: weight halves every halfLifeDays days.
// Prevents stale behavior from permanently biasing recommendations.
//
// Hardening (factor must always land in [0, 1]):
//   - halfLifeDays <= 0          → invalid config, treat as no-decay (factor=1)
//   - now < lastUpdatedAt        → clock skew / future signal, clamp ageDays to 0
//   - non-finite Math.pow result → fallback to factor=1 (defense in depth)
function computeDecayFactor(
  now: number,
  lastUpdatedAt: number,
  halfLifeDays: number,
): number {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 1;
  const ageDays = Math.max(0, (now - lastUpdatedAt) / 86_400_000);
  const factor = Math.pow(0.5, ageDays / halfLifeDays);
  if (!Number.isFinite(factor)) return 1;
  return Math.min(1, Math.max(0, factor));
}

export function applyDecay(
  signals: ImplicitSignals,
  now: number,
): ImplicitSignals {
  const factor = computeDecayFactor(
    now,
    signals.lastUpdatedAt,
    signals.decay.halfLifeDays,
  );

  function decayList<T>(items: Weighted<T>[] | undefined): Weighted<T>[] | undefined {
    if (!items) return undefined;
    return items.map((i) => ({ ...i, weight: i.weight * factor }));
  }

  const inferred = signals.inferredPreferences;
  return {
    ...signals,
    inferredPreferences: {
      roles: decayList(inferred.roles),
      skills: decayList(inferred.skills),
      industries: decayList(inferred.industries),
      companySizes: decayList(inferred.companySizes),
      fundingStages: decayList(inferred.fundingStages),
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
    companySizes: mergeList(
      explicit.companySizes,
      implicit.companySizes,
      new Set(),
    ),
    fundingStages: mergeList(
      explicit.fundingStages,
      implicit.fundingStages,
      new Set(),
    ),
    workMode: explicit.workMode
      ? normalizeWeights(explicit.workMode)
      : undefined,
    salary: explicit.salary,
  };
}

// ── 4. extractImplicitSignals ─────────────────────────────────────────────────
// Derives ImplicitSignals from Phase 1 local data + bookmark job context.
//   - bookmarks → behaviorMetrics; job/company attributes when context is supplied
//   - savedSearches → inferredPreferences.skills from `filters.stack`
//
// RULE: capabilities are never inferred from behavior (skills here are preference
// signals, merged into preferences.skills with explicit dominance).
export function extractImplicitSignals(
  bookmarks: BookmarkItem[],
  savedSearches: SavedSearchItem[],
  bookmarkJobContexts: BookmarkJobSignalContext[] = [],
): ImplicitSignals {
  const bookmarkCount = bookmarks.length;
  const appliedCount = bookmarks.filter(
    (b) => b.status !== undefined && APPLIED_STATUSES.includes(b.status),
  ).length;
  const applyRate = bookmarkCount > 0 ? appliedCount / bookmarkCount : 0;

  const weightByJobId = new Map(
    bookmarks.map((b) => [b.job_id, bookmarkSignalWeight(b.status)]),
  );

  const skillCounts = new Map<string, CountEntry>();
  const roleCounts = new Map<string, CountEntry>();
  const industryCounts = new Map<string, CountEntry>();
  const sizeCounts = new Map<string, CountEntry>();
  const fundingCounts = new Map<string, CountEntry>();

  for (const s of savedSearches) {
    const stack = s.filters.stack;
    if (!stack) continue;
    for (const raw of stack.split(",")) {
      addWeightedCount(skillCounts, raw, 1);
    }
  }

  for (const ctx of bookmarkJobContexts) {
    const weight = weightByJobId.get(ctx.job_id) ?? 1;
    addWeightedCount(roleCounts, ctx.role_title, weight);
    addWeightedCount(industryCounts, ctx.industry, weight);
    addWeightedCount(sizeCounts, ctx.size, weight);
    addWeightedCount(fundingCounts, ctx.funding_stage, weight);
    for (const tech of ctx.tech_stack) {
      addWeightedCount(skillCounts, tech, weight);
    }
  }

  const inferredPreferences: ImplicitSignals["inferredPreferences"] = {};
  const roles = countsToFrequencyWeights(roleCounts);
  const skills = countsToFrequencyWeights(skillCounts);
  const industries = countsToFrequencyWeights(industryCounts);
  const companySizes = countsToFrequencyWeights(sizeCounts);
  const fundingStages = countsToFrequencyWeights(fundingCounts);

  if (roles) inferredPreferences.roles = roles;
  if (skills) inferredPreferences.skills = skills;
  if (industries) inferredPreferences.industries = industries;
  if (companySizes) inferredPreferences.companySizes = companySizes;
  if (fundingStages) inferredPreferences.fundingStages = fundingStages;

  return {
    inferredPreferences,
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
  bookmarkJobContexts: BookmarkJobSignalContext[] = [],
): UnifiedSignals {
  const now = Date.now();
  const rawImplicit = extractImplicitSignals(
    bookmarks,
    savedSearches,
    bookmarkJobContexts,
  );
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
