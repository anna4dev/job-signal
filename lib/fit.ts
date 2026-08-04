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

/**
 * Location allow-list = where you can show up in person.
 * Remote jobs are not tied to HQ country when the user accepts remote work
 * (work.modes includes remote, remoteOk on a spec, or an explicit remote tag).
 */
function locationAllows(
  job: FitJobInput,
  allow: LocationSpec[],
  acceptedModes: WorkMode[] = [],
): boolean {
  if (allow.length === 0) return true;

  const country = canonical(job.location_country);
  const city = canonical(job.location_city);
  const tz = canonical(job.location_timezone);
  const isRemote =
    job.location_remote === 1 || deriveWorkMode(job) === "remote";

  // Accepting remote means HQ geography (NA vs South Asia) is not a hard fail.
  if (isRemote && acceptedModes.includes("remote")) {
    return true;
  }

  if (
    isRemote &&
    allow.some(
      (spec) =>
        spec.remoteOk === true ||
        spec.scope === "remote_tz" ||
        isRemoteAnywhereId(canonical(spec.id)),
    )
  ) {
    return true;
  }

  return allow.some((spec) => {
    const id = canonical(spec.id);
    if (!id) return false;

    // Legacy: "Remote" saved as scope=country still means remote-anywhere.
    if (isRemoteAnywhereId(id)) {
      return isRemote;
    }

    switch (spec.scope) {
      case "country":
        if (country && tokensMatch(country, id)) {
          return true;
        }
        return Boolean(spec.remoteOk && isRemote);
      case "city":
        return Boolean(city && tokensMatch(city, id));
      case "region":
        return Boolean(
          (country && tokensMatch(country, id)) ||
            (city && tokensMatch(city, id)),
        );
      case "remote_tz":
        if (!isRemote) return false;
        if (id === "global" || id.endsWith("_tz") || id.includes("global")) {
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
 */
function preferenceCoverage(
  preferred: Weighted<ID>[],
  jobTokens: string[],
): number | null {
  if (preferred.length === 0) return null;
  const jobKeys = jobTokens.map(canonical).filter(Boolean);
  if (jobKeys.length === 0) return 0;

  let matched = 0;
  for (const item of preferred) {
    const key = canonical(item.value);
    if (!key) continue;
    if (jobKeys.some((jk) => tokensMatch(jk, key))) {
      matched += item.weight;
    }
  }
  return Math.min(1, Math.max(0, matched));
}

function roleMatchScore(
  preferred: Weighted<ID>[],
  roleTitle: string,
): number | null {
  if (preferred.length === 0) return null;
  const title = canonical(roleTitle);
  if (!title) return 0;
  let matched = 0;
  for (const item of preferred) {
    const key = canonical(item.value);
    if (!key) continue;
    if (tokensMatch(title, key)) {
      matched += item.weight;
    }
  }
  return Math.min(1, Math.max(0, matched));
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
  const jobKeys = jobSkills.map(canonical).filter(Boolean);
  if (jobKeys.length === 0) return 0;

  let matchedWeight = 0;
  let totalWeight = 0;
  for (const item of skills) {
    totalWeight += item.weight;
    const key = canonical(item.value);
    if (!key) continue;
    if (jobKeys.some((jk) => tokensMatch(jk, key))) {
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
    const ok = locationAllows(job, hc.locations.allow, hc.work.modes);
    breakdown.push({
      key: "location_constraint",
      score: ok ? 1 : 0,
      weight: 1,
      contribution: 0,
      detail: ok ? "location allowed" : "location not in allow-list",
    });
    if (!ok) failed.push("location_constraint");
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
  const role = roleMatchScore(pref.roles, job.role_title);
  if (role != null) {
    pushFactor(out, "preference_role_match", role, 1, job.role_title);
  }

  const skillPref = preferenceCoverage(pref.skills, job.tech_stack);
  if (skillPref != null) {
    pushFactor(out, "preference_skill_match", skillPref, 1);
  }

  const industry = preferenceCoverage(
    pref.industries,
    job.industry ? [job.industry] : [],
  );
  if (industry != null) {
    pushFactor(out, "preference_industry_match", industry, 1, job.industry ?? undefined);
  }

  const size = preferenceCoverage(pref.companySizes, job.size ? [job.size] : []);
  if (size != null) {
    pushFactor(out, "preference_company_size_match", size, 1, job.size ?? undefined);
  }

  const funding = preferenceCoverage(
    pref.fundingStages,
    job.funding_stage ? [job.funding_stage] : [],
  );
  if (funding != null) {
    pushFactor(
      out,
      "preference_funding_stage_match",
      funding,
      1,
      job.funding_stage ?? undefined,
    );
  }

  if (pref.workMode && pref.workMode.length > 0) {
    const modeHit = pref.workMode.find((m) => m.value === jobMode);
    const score = modeHit ? Math.min(1, modeHit.weight) : 0;
    // Prefer absolute match quality: if workMode is normalized, weight of matched mode is the score.
    // If multiple modes, sum of matching weights (at most one mode matches).
    pushFactor(out, "preference_work_mode_match", score, 1, jobMode);
  }

  if (pref.salary) {
    const score = salaryMatchScore(job, pref.salary);
    const weight = Math.max(0.1, pref.salary.weight);
    pushFactor(out, "preference_salary_match", score, weight);
  }

  // Capabilities
  const capSkills = capabilitySkillScore(cap.skills, jobSkills);
  if (capSkills != null) {
    pushFactor(out, "capability_skill_match", capSkills, 1);
  }

  pushFactor(
    out,
    "capability_level_match",
    levelMatchScore(cap.seniorityLevel, job.level),
    1,
    `${cap.seniorityLevel}→${job.level}`,
  );

  // Soft rejections (negative contributions)
  if (soft.skills?.length) {
    const hit = preferenceCoverage(soft.skills, job.tech_stack);
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
