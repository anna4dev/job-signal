import type { JobLevel } from "./job";

// ── Base Types ────────────────────────────────────────────────────────────────

// All value IDs are plain strings (skill name / role / industry / company as canonical key).
export type ID = string;

// Weight: raw 0~1 value.
// INVARIANT: UnifiedSignals.preferences must be pre-normalized (per-dimension sum=1).
// fit() reads weights directly — calling normalizeWeights inside fit() is forbidden.
export type Weight = number;

export type Currency = "USD" | "EUR" | "KRW" | "CNY";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type EmploymentType = "full-time" | "contract" | "part-time";
export type Timezone = "US" | "EU" | "ASIA" | "GLOBAL";

// Weighted<T>: carries value + weight + provenance for explainability.
export interface Weighted<T> {
  value: T;
  // Raw weight (0~1). Normalized at write time for UnifiedSignals.preferences.
  weight: Weight;
  source?: "explicit" | "implicit"; // used in factorBreakdown explain
}

// LocationSpec: distinguishes country / city / region, supports remote+area combos.
export type LocationScope = "country" | "city" | "region" | "remote_tz";
export interface LocationSpec {
  scope: LocationScope;
  id: ID; // e.g. 'US', 'SF', 'EU', 'US_TZ'
  remoteOk?: boolean; // true = accept remote jobs in this area
}

// ── 1. HardConstraints — filter only, no scoring ─────────────────────────────
// Any unmet constraint → score=0 (hard fail). No partial credit.
export interface HardConstraints {
  visa: { required: boolean };
  work: {
    // HardConstraints.work.modes: binary filter (job mode not in list → fail).
    // Preferences.workMode: ranking weight — semantics are different.
    modes: WorkMode[];
    timezoneOverlap?: Timezone;
  };
  locations: { allow: LocationSpec[] };
  employmentTypes: EmploymentType[];
}

// ── 2. Capabilities — objective facts, no intent ─────────────────────────────
// Must NOT contain intent fields (roles / salary belong in Preferences).
export interface Capabilities {
  // weight = proficiency (0=beginner, 1=expert) — used for capability_skill_match only.
  // Semantically distinct from Preferences.skills.weight (desire-to-use).
  skills: Weighted<ID>[];
  yearsOfExperience: number;
  seniorityLevel: JobLevel; // reused from types/job.ts
  domains?: ID[]; // industry experience (optional)
  languages?: { code: string; level: "basic" | "working" | "fluent" }[];
}

// ── 3. Preferences — all Weighted, no bare arrays ────────────────────────────
// RULE: Every dimension must use Weighted<T>[].
// RULE: Per-dimension sum(weight)=1 is enforced at write time in UnifiedSignals.
// Preferences.skills.weight = desire-to-use (≠ Capabilities.skills.weight = proficiency).
export interface Preferences {
  roles: Weighted<ID>[]; // weight = intent strength
  skills: Weighted<ID>[]; // weight = desire to use this technology
  industries: Weighted<ID>[];
  companySizes: Weighted<ID>[]; // values align with company_structured.size enum
  fundingStages: Weighted<ID>[]; // values align with company_structured.funding_stage enum
  workMode?: Weighted<WorkMode>[]; // ranking only; HardConstraints.work.modes handles filtering
  salary?: {
    min?: number;
    max?: number;
    currency: Currency;
    weight: Weight; // salary's relative importance in overall preference score
  };
}

// ── 4. Rejections — hard=filter, soft=weighted penalty ───────────────────────
// Conflict priority: Rejections.soft > Preferences > Capabilities.
// A skill ID in soft.skills is removed from Preferences.skills at mergePreferences time.
export interface Rejections {
  hard: {
    companyIds?: ID[];
    industries?: ID[];
  };
  soft: {
    skills?: Weighted<ID>[]; // weight = rejection intensity (0~1)
    noOncall?: Weight; // 0=indifferent, 1=absolute rejection
    companyTypes?: Weighted<ID>[]; // weight = rejection intensity
  };
}

// ── 5. ImplicitSignals — behavior-derived, with time decay ───────────────────
// RULE: Implicit signals only enter scoring via mergePreferences (no standalone scoring).
// RULE: All inferred fields must be Weighted<T>[] (no bare arrays).
export interface ImplicitSignals {
  inferredPreferences: {
    roles?: Weighted<ID>[];
    skills?: Weighted<ID>[];
    industries?: Weighted<ID>[];
  };
  behaviorMetrics: {
    bookmarkCount: number;
    applyRate: number; // applied / bookmarked
  };
  decay: {
    halfLifeDays: number; // default 30: weight halves every 30 days
    computedAt: number; // timestamp of last decay application
  };
  lastUpdatedAt: number;
}

// ── ExplicitProfile — user-editable section stored as explicit_profile_v1 ────
export interface ExplicitProfile {
  version: "1";
  updatedAt: number;
  hardConstraints: HardConstraints;
  capabilities: Capabilities;
  preferences: Preferences;
  rejections: Rejections;
}

// ── UnifiedSignals — Phase 3's sole input ─────────────────────────────────────
// INVARIANT: preferences is pre-normalized (sum=1 per dimension).
// preferences = result of mergePreferences(explicit, decayed_implicit, rejections).
// fit() reads weights directly — no normalizeWeights call allowed inside fit().
export interface UnifiedSignals {
  version: "1";
  updatedAt: number;
  hardConstraints: HardConstraints;
  capabilities: Capabilities;
  preferences: Preferences; // normalized + merged + conflict-resolved
  rejections: Rejections;
  implicit: ImplicitSignals; // preserved raw for debug / explain
}

// ── FactorKey — explainability labels for Phase 2.3 / Phase 3 ────────────────
// capability_skill_match vs preference_skill_match distinguish scoring source.
export type FactorKey =
  | "visa_constraint"
  | "work_mode_constraint"
  | "location_constraint"
  | "employment_type_constraint"
  | "hard_rejection_industry"
  | "hard_rejection_company"
  | "capability_skill_match" // proficiency × job required_skills
  | "capability_level_match"
  | "preference_role_match"
  | "preference_skill_match" // desire-to-use × job offered skills
  | "preference_industry_match"
  | "preference_company_size_match"
  | "preference_funding_stage_match"
  | "preference_work_mode_match"
  | "preference_salary_match"
  | "soft_rejection_oncall"
  | "soft_rejection_skill"
  | "soft_rejection_company_type";
