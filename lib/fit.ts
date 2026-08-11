import type {
  FactorKey,
  LocationSpec,
  UnifiedSignals,
  Weighted,
  WorkMode,
  ID,
} from "@/types/profile";
import type { JobLevel } from "@/types/job";
import type {
  FactorContribution,
  FitJobInput,
  FitResult,
} from "@/types/fit";
import { parseTechStackField } from "@/lib/parseJobFields";
import { canonCountry, countryInAllowRegion } from "@/lib/locationRegions";
import {
  roleTitleMatches,
  skillPreferredMatchesJob,
} from "@/lib/fitNormalize";

// Re-export for ProfileContent / callers that need the shared macro check.
export { isMacroRegionId } from "@/lib/locationRegions";

// ── Constants ────────────────────────────────────────────────────────────────

const LEVEL_RANK: Record<JobLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  staff: 4,
  principal: 5,
  unknown: 2,
};

const ONCALL_RE = /\bon[\s-]?call\b/i;

/** Soft-rejection penalty scale (keeps penalties from zeroing a strong match alone). */
const SOFT_PENALTY_SCALE = 0.35;

/**
 * Soft-factor relative weights. Location / work mode / visa are hard gates only.
 * Role + skills dominate ranking; industry/level/size are secondary.
 */
const W_ROLE = 3;
const W_SKILL_PREF = 2.5;
const W_SKILL_CAP = 2.5;
const W_LEVEL = 0.4;
const W_INDUSTRY = 0.5;
const W_SIZE = 0.3;
const W_FUNDING = 0.3;
const W_WORK_MODE_PREF = 0.4;

/** Min length before fuzzy substring matching is allowed (exact match always OK). */
const MIN_FUZZY_LEN = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

function canonical(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/**
 * Exact match always wins. Bidirectional substring only when both sides are
 * long enough — avoids "us"⊂"russia", "go"⊂"google", "c"⊂"c++"/"react".
 */
function tokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < MIN_FUZZY_LEN || b.length < MIN_FUZZY_LEN) return false;
  return a.includes(b) || b.includes(a);
}

function deriveWorkMode(job: FitJobInput): WorkMode {
  const ws = canonical(job.work_style);
  if (ws.includes("hybrid")) return "hybrid";
  if (ws.includes("remote") || job.location_remote === 1) return "remote";
  if (
    ws.includes("onsite") ||
    ws.includes("on-site") ||
    ws.includes("on site") ||
    ws.includes("office")
  ) {
    return "onsite";
  }
  return job.location_remote === 1 ? "remote" : "onsite";
}

/** Free-text / suggest values that mean "remote anywhere", not a country. */
function isRemoteAnywhereId(id: string): boolean {
  return (
    id === "remote" ||
    id === "worldwide" ||
    id === "anywhere" ||
    id === "global" ||
    id === "remote_tz"
  );
}

/** Direct country/city token match, alias canon, or macro-region membership. */
function geoMatchesSpec(
  country: string,
  city: string,
  specId: string,
): boolean {
  if (country) {
    if (tokensMatch(country, specId)) return true;
    if (canonCountry(country) === canonCountry(specId)) return true;
    if (countryInAllowRegion(country, specId)) return true;
  }
  if (city && tokensMatch(city, specId)) return true;
  return false;
}

function allowIncludesRemoteAnywhere(allow: LocationSpec[]): boolean {
  return allow.some(
    (spec) =>
      spec.scope === "remote_tz" || isRemoteAnywhereId(canonical(spec.id)),
  );
}

/** Job has no usable geographic anchor (UI "Location N/A"). */
function jobLacksGeography(job: FitJobInput): boolean {
  const country = canonical(job.location_country);
  const city = canonical(job.location_city);
  // Empty or remote-anywhere placeholders are not hire-from regions.
  const hasCountry = Boolean(country && !isRemoteAnywhereId(country));
  const hasCity = Boolean(city && !isRemoteAnywhereId(city));
  return !hasCountry && !hasCity;
}

/**
 * Location allow-list = where the candidate can work from / relocate to.
 *
 * - Remote with a stated country/city must overlap the allow-list
 *   (Singapore profile ≠ US-only remote). Macro regions (EU, NA, …) expand
 *   to member countries (EU covers Germany).
 * - Remote with no country/city (Location N/A) passes location regardless of
 *   profile allow-list — the JD did not constrain geography.
 * - Relocatable roles (onsite/hybrid) with job visa sponsorship bypass the
 *   allow-list (US/UK onsite+visa can fit a non-US/non-UK profile location).
 * - Explicit Remote/worldwide profile tags still opt into remote-anywhere when
 *   the JD names a country outside the allow-list.
 */
function locationAllows(job: FitJobInput, allow: LocationSpec[]): boolean {
  if (allow.length === 0) return true;

  const mode = deriveWorkMode(job);
  const isRemote = mode === "remote";

  // Visa-sponsored relocation: onsite/hybrid may be outside the allow-list.
  if (!isRemote && job.location_visa_supported === 1) {
    return true;
  }

  // JD remote + no geography → not a location hard-fail (profile may still
  // filter via work.modes). Stated-country remote still must align below.
  if (isRemote && jobLacksGeography(job)) {
    return true;
  }

  if (isRemote && allowIncludesRemoteAnywhere(allow)) {
    return true;
  }

  const country = canonical(job.location_country);
  const city = canonical(job.location_city);
  const tz = canonical(job.location_timezone);

  return allow.some((spec) => {
    const id = canonical(spec.id);
    if (!id) return false;

    // Legacy: "Remote" saved as scope=country still means remote-anywhere.
    if (isRemoteAnywhereId(id)) {
      return isRemote;
    }

    switch (spec.scope) {
      case "country":
      case "region":
        return geoMatchesSpec(country, city, id);
      case "city":
        return Boolean(city && tokensMatch(city, id));
      case "remote_tz":
        if (!isRemote) return false;
        if (
          isRemoteAnywhereId(id) ||
          id === "global" ||
          id.endsWith("_tz") ||
          id.includes("global")
        ) {
          return true;
        }
        return !tz || tokensMatch(tz, id);
      default:
        return false;
    }
  });
}

function timezoneOk(
  job: FitJobInput,
  overlap: UnifiedSignals["hardConstraints"]["work"]["timezoneOverlap"],
): boolean {
  if (!overlap || overlap === "GLOBAL") return true;
  if (job.location_remote !== 1) return true;
  const tz = canonical(job.location_timezone);
  if (!tz) return true;
  const target = overlap.toLowerCase();
  return tokensMatch(tz, target);
}

/**
 * Preference mass that matches job tokens. Preferences are pre-normalized
 * (sum≈1), so the result is already in [0, 1]. Empty preference list → null (skip).
 * When skillAware, expand compounds like React/Next.js (TypeScript).
 */
function preferenceCoverage(
  preferred: Weighted<ID>[],
  jobTokens: string[],
  skillAware = false,
): number | null {
  if (preferred.length === 0) return null;
  if (jobTokens.length === 0) return 0;

  let matched = 0;
  for (const item of preferred) {
    const key = canonical(item.value);
    if (!key) continue;
    const hit = skillAware
      ? skillPreferredMatchesJob(item.value, jobTokens)
      : jobTokens.some((jk) => tokensMatch(canonical(jk), key));
    if (hit) matched += item.weight;
  }
  return Math.min(1, Math.max(0, matched));
}

function roleMatchScore(
  preferred: Weighted<ID>[],
  roleTitle: string,
): number | null {
  if (preferred.length === 0) return null;
  if (!canonical(roleTitle)) return 0;
  let matched = 0;
  for (const item of preferred) {
    const key = canonical(item.value);
    if (!key) continue;
    if (roleTitleMatches(roleTitle, item.value)) {
      matched += item.weight;
    }
  }
  return Math.min(1, Math.max(0, matched));
}

/** Explicit Target roles only — ignore bookmark-inferred implicit roles for hard gate. */
function explicitTargetRoles(
  roles: Weighted<ID>[],
): Weighted<ID>[] {
  return roles.filter((r) => r.source !== "implicit");
}

function salaryMatchScore(
  job: FitJobInput,
  salary: NonNullable<UnifiedSignals["preferences"]["salary"]>,
): number {
  const jobLow = job.salary_min;
  const jobHigh = job.salary_max ?? job.salary_min;
  if (jobLow == null && jobHigh == null) return 0.4; // unknown salary → mild neutral

  const prefMin = salary.min;
  const prefMax = salary.max;
  const mid =
    jobLow != null && jobHigh != null
      ? (jobLow + jobHigh) / 2
      : (jobLow ?? jobHigh)!;

  if (prefMin != null && mid < prefMin) {
    const gap = prefMin - mid;
    return Math.max(0, 1 - gap / Math.max(prefMin, 1));
  }
  if (prefMax != null && mid > prefMax) {
    const gap = mid - prefMax;
    return Math.max(0, 1 - gap / Math.max(prefMax, 1));
  }
  return 1;
}

function levelMatchScore(userLevel: JobLevel, jobLevel: JobLevel): number {
  const a = LEVEL_RANK[userLevel] ?? 2;
  const b = LEVEL_RANK[jobLevel] ?? 2;
  const distance = Math.abs(a - b);
  return Math.max(0, 1 - distance / 3);
}

function capabilitySkillScore(
  skills: Weighted<ID>[],
  jobSkills: string[],
): number | null {
  if (skills.length === 0) return null;
  if (jobSkills.length === 0) return 0;

  let matchedWeight = 0;
  let totalWeight = 0;
  for (const item of skills) {
    totalWeight += item.weight;
    const key = canonical(item.value);
    if (!key) continue;
    if (skillPreferredMatchesJob(item.value, jobSkills)) {
      matchedWeight += item.weight;
    }
  }
  if (totalWeight <= 0) return null;
  return Math.min(1, matchedWeight / totalWeight);
}

function pushFactor(
  out: FactorContribution[],
  key: FactorKey,
  score: number,
  weight: number,
  detail?: string,
  signed = 1,
): void {
  if (weight <= 0) return;
  out.push({
    key,
    score,
    weight,
    contribution: signed * weight * score,
    detail,
  });
}

function reasonTagFor(key: FactorKey, hardFail: boolean): string {
  const labels: Partial<Record<FactorKey, string>> = {
    visa_constraint: hardFail ? "Visa requirement unmet" : "Visa OK",
    work_mode_constraint: hardFail ? "Work mode mismatch" : "Work mode OK",
    location_constraint: hardFail ? "Location mismatch" : "Location OK",
    role_constraint: hardFail ? "Role mismatch" : "Role OK",
    hard_rejection_industry: "Blocked industry",
    hard_rejection_company: "Blocked company",
    capability_skill_match: "Skill fit",
    capability_level_match: "Level fit",
    preference_role_match: "Role match",
    preference_skill_match: "Stack match",
    preference_industry_match: "Industry match",
    preference_company_size_match: "Company size match",
    preference_funding_stage_match: "Funding stage match",
    preference_work_mode_match: "Preferred work mode",
    preference_salary_match: "Salary fit",
    soft_rejection_oncall: "On-call risk",
    soft_rejection_skill: "Avoided stack",
    soft_rejection_company_type: "Avoided company type",
  };
  return labels[key] ?? key;
}

// ── Hard constraints ─────────────────────────────────────────────────────────

function evaluateHardConstraints(
  job: FitJobInput,
  signals: UnifiedSignals,
): { failed: FactorKey[]; breakdown: FactorContribution[] } {
  const failed: FactorKey[] = [];
  const breakdown: FactorContribution[] = [];
  const hc = signals.hardConstraints;
  const hard = signals.rejections.hard;

  // Visa
  if (hc.visa.required) {
    const ok = job.location_visa_supported === 1;
    breakdown.push({
      key: "visa_constraint",
      score: ok ? 1 : 0,
      weight: 1,
      contribution: 0,
      detail: ok ? "visa supported" : "visa required but unsupported",
    });
    if (!ok) failed.push("visa_constraint");
  }

  // Work mode
  if (hc.work.modes.length > 0) {
    const mode = deriveWorkMode(job);
    const ok = hc.work.modes.includes(mode);
    breakdown.push({
      key: "work_mode_constraint",
      score: ok ? 1 : 0,
      weight: 1,
      contribution: 0,
      detail: `job=${mode}; allow=${hc.work.modes.join(",")}`,
    });
    if (!ok) failed.push("work_mode_constraint");
  }

  if (
    hc.work.timezoneOverlap &&
    hc.work.timezoneOverlap !== "GLOBAL" &&
    !timezoneOk(job, hc.work.timezoneOverlap)
  ) {
    if (!failed.includes("work_mode_constraint")) {
      failed.push("work_mode_constraint");
    }
    breakdown.push({
      key: "work_mode_constraint",
      score: 0,
      weight: 1,
      contribution: 0,
      detail: `timezone overlap unmet (${hc.work.timezoneOverlap})`,
    });
  }

  // Locations
  if (hc.locations.allow.length > 0) {
    const ok = locationAllows(job, hc.locations.allow);
    breakdown.push({
      key: "location_constraint",
      score: ok ? 1 : 0,
      weight: 1,
      contribution: 0,
      detail: ok ? "location allowed" : "location not in allow-list",
    });
    if (!ok) failed.push("location_constraint");
  }

  // Explicit Target roles only (not bookmark-inferred implicit roles).
  // Location/work mode gate eligibility; explicit roles gate title family.
  const targetRoles = explicitTargetRoles(signals.preferences.roles);
  if (targetRoles.length > 0) {
    const roleScore = roleMatchScore(targetRoles, job.role_title);
    const ok = roleScore != null && roleScore > 0;
    breakdown.push({
      key: "role_constraint",
      score: ok ? 1 : 0,
      weight: 1,
      contribution: 0,
      detail: ok
        ? `role matched (${job.role_title})`
        : `role not in target list (${job.role_title})`,
    });
    if (!ok) failed.push("role_constraint");
  }

  // Hard industry rejection
  if (hard.industries?.length && job.industry) {
    const industry = canonical(job.industry);
    const hit = hard.industries.some((id) => canonical(id) === industry);
    if (hit) {
      failed.push("hard_rejection_industry");
      breakdown.push({
        key: "hard_rejection_industry",
        score: 0,
        weight: 1,
        contribution: 0,
        detail: job.industry,
      });
    }
  }

  // Hard company rejection
  if (hard.companyIds?.length) {
    const hit = hard.companyIds.some(
      (id) => canonical(id) === canonical(job.company_id),
    );
    if (hit) {
      failed.push("hard_rejection_company");
      breakdown.push({
        key: "hard_rejection_company",
        score: 0,
        weight: 1,
        contribution: 0,
        detail: job.company_id,
      });
    }
  }

  return { failed, breakdown };
}

// ── Soft scoring ─────────────────────────────────────────────────────────────

function evaluateSoftFactors(
  job: FitJobInput,
  signals: UnifiedSignals,
): FactorContribution[] {
  const out: FactorContribution[] = [];
  const pref = signals.preferences;
  const cap = signals.capabilities;
  const soft = signals.rejections.soft;
  const jobMode = deriveWorkMode(job);
  const jobSkills =
    job.required_skills && job.required_skills.length > 0
      ? job.required_skills
      : job.tech_stack;

  // Preferences (pre-normalized — do NOT call normalizeWeights)
  // Role hard-gate is in evaluateHardConstraints; soft role score ranks matches.
  const role = roleMatchScore(pref.roles, job.role_title);
  if (role != null && role > 0) {
    pushFactor(out, "preference_role_match", role, W_ROLE, job.role_title);
  }

  const skillPref = preferenceCoverage(pref.skills, job.tech_stack, true);
  if (skillPref != null) {
    pushFactor(out, "preference_skill_match", skillPref, W_SKILL_PREF);
  }

  const industry = preferenceCoverage(
    pref.industries,
    job.industry ? [job.industry] : [],
  );
  // Secondary dims: only boost when they hit — zeros must not drag role/skill.
  if (industry != null && industry > 0) {
    pushFactor(out, "preference_industry_match", industry, W_INDUSTRY, job.industry ?? undefined);
  }

  const size = preferenceCoverage(pref.companySizes, job.size ? [job.size] : []);
  if (size != null && size > 0) {
    pushFactor(out, "preference_company_size_match", size, W_SIZE, job.size ?? undefined);
  }

  const funding = preferenceCoverage(
    pref.fundingStages,
    job.funding_stage ? [job.funding_stage] : [],
  );
  if (funding != null && funding > 0) {
    pushFactor(
      out,
      "preference_funding_stage_match",
      funding,
      W_FUNDING,
      job.funding_stage ?? undefined,
    );
  }

  if (pref.workMode && pref.workMode.length > 0) {
    const modeHit = pref.workMode.find((m) => m.value === jobMode);
    const score = modeHit ? Math.min(1, modeHit.weight) : 0;
    if (score > 0) {
      pushFactor(out, "preference_work_mode_match", score, W_WORK_MODE_PREF, jobMode);
    }
  }

  if (pref.salary) {
    const score = salaryMatchScore(job, pref.salary);
    const weight = Math.max(0.1, pref.salary.weight);
    pushFactor(out, "preference_salary_match", score, weight);
  }

  // Capabilities
  const capSkills = capabilitySkillScore(cap.skills, jobSkills);
  if (capSkills != null) {
    pushFactor(out, "capability_skill_match", capSkills, W_SKILL_CAP);
  }

  pushFactor(
    out,
    "capability_level_match",
    levelMatchScore(cap.seniorityLevel, job.level),
    W_LEVEL,
    `${cap.seniorityLevel}→${job.level}`,
  );

  // Soft rejections (negative contributions)
  if (soft.skills?.length) {
    const hit = preferenceCoverage(soft.skills, job.tech_stack, true);
    if (hit != null && hit > 0) {
      pushFactor(
        out,
        "soft_rejection_skill",
        hit,
        SOFT_PENALTY_SCALE,
        undefined,
        -1,
      );
    }
  }

  if (soft.companyTypes?.length && job.size) {
    const hit = preferenceCoverage(soft.companyTypes, [job.size]);
    if (hit != null && hit > 0) {
      pushFactor(
        out,
        "soft_rejection_company_type",
        hit,
        SOFT_PENALTY_SCALE,
        job.size,
        -1,
      );
    }
  }

  if (soft.noOncall && soft.noOncall > 0) {
    const blob = (job.responsibilities ?? []).join(" ");
    if (ONCALL_RE.test(blob)) {
      pushFactor(
        out,
        "soft_rejection_oncall",
        soft.noOncall,
        SOFT_PENALTY_SCALE,
        "on-call mentioned",
        -1,
      );
    }
  }

  return out;
}

function buildReasonTags(
  hardFail: boolean,
  hardFailReasons: FactorKey[],
  soft: FactorContribution[],
): string[] {
  if (hardFail) {
    return hardFailReasons.map((k) => reasonTagFor(k, true));
  }

  const positives = soft
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => reasonTagFor(f.key, false));

  const negatives = soft
    .filter((f) => f.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 2)
    .map((f) => reasonTagFor(f.key, false));

  return [...positives, ...negatives];
}

/**
 * Deterministic fit engine (Phase 3.1).
 *
 * INVARIANT: does not call normalizeWeights — UnifiedSignals.preferences is
 * already per-dimension normalized. Implicit signals are not scored separately.
 *
 * Hard-constraint failure → fitScore 0.
 * Otherwise fitScore = round(clamp01(weightedUtility) * 100).
 */
export function fit(job: FitJobInput, signals: UnifiedSignals): FitResult {
  const hard = evaluateHardConstraints(job, signals);
  if (hard.failed.length > 0) {
    return {
      fitScore: 0,
      hardFail: true,
      hardFailReasons: hard.failed,
      reasonTags: buildReasonTags(true, hard.failed, []),
      factorBreakdown: hard.breakdown,
    };
  }

  const soft = evaluateSoftFactors(job, signals);
  const positiveWeight = soft
    .filter((f) => f.contribution >= 0)
    .reduce((s, f) => s + f.weight, 0);
  const positiveSum = soft
    .filter((f) => f.contribution >= 0)
    .reduce((s, f) => s + f.contribution, 0);
  const penalty = soft
    .filter((f) => f.contribution < 0)
    .reduce((s, f) => s + Math.abs(f.contribution), 0);

  let utility = 0.5; // empty profile → neutral mid score
  if (positiveWeight > 0) {
    utility = positiveSum / positiveWeight;
  }
  utility = Math.max(0, Math.min(1, utility - Math.min(1, penalty)));

  const fitScore = Math.round(utility * 100);
  const factorBreakdown = [...hard.breakdown, ...soft];

  return {
    fitScore,
    hardFail: false,
    hardFailReasons: [],
    reasonTags: buildReasonTags(false, [], soft),
    factorBreakdown,
  };
}

/** Adapt a list/detail job row into FitJobInput (parses tech_stack JSON). */
export function toFitJobInput(
  job: {
    job_id: string;
    company_id: string;
    role_title: string;
    level: JobLevel;
    location_city: string | null;
    location_country: string | null;
    location_remote: number;
    location_timezone: string | null;
    location_visa_supported: number;
    salary_min: number | null;
    salary_max: number | null;
    industry: string | null;
    size: string | null;
    funding_stage: string | null;
    tech_stack: string | string[];
    required_skills?: string | string[];
    responsibilities?: string | string[];
    work_style?: string | null;
  },
): FitJobInput {
  return {
    job_id: job.job_id,
    company_id: job.company_id,
    role_title: job.role_title,
    level: job.level,
    location_city: job.location_city,
    location_country: job.location_country,
    location_remote: job.location_remote,
    location_timezone: job.location_timezone,
    location_visa_supported: job.location_visa_supported,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    industry: job.industry,
    size: job.size,
    funding_stage: job.funding_stage,
    tech_stack: parseTechStackField(job.tech_stack),
    required_skills: job.required_skills
      ? parseTechStackField(job.required_skills)
      : undefined,
    responsibilities: job.responsibilities
      ? parseTechStackField(job.responsibilities)
      : undefined,
    work_style: job.work_style ?? null,
  };
}
