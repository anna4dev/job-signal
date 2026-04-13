export type Overrides = Record<
  string,
  {
    salary?: { type: "overwrite"; value: SalaryValue };
    visa_support?: { type: "overwrite"; value: boolean | null };
    tech_stack?: { add: string[]; remove: string[] };
  }
>;

export type SalaryValue = {
  min: number | null;
  max: number | null;
};

export type BaseJobForOverrides = {
  job_id: string;
  salary_min: number | null;
  salary_max: number | null;
  location_visa_supported: number | null;
  tech_stack: string[];
};

export type EffectiveJobForOverrides = {
  salary_min: number | null;
  salary_max: number | null;
  location_visa_supported: boolean | null;
  tech_stack: string[];
};

export const JOB_OVERRIDES_KEY = "job_overrides_v1";

export function mapVisaSupportedValue(
  visaSupported: number | null,
): boolean | null {
  return visaSupported === 1 ? true : visaSupported === 0 ? false : null;
}

export function getJobOverridesFromLocalStorage(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(JOB_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Overrides;
  } catch {
    return {};
  }
}

export function setJobOverridesToLocalStorage(overrides: Overrides) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOB_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function mergeJobWithOverrides(
  baseJob: BaseJobForOverrides,
  overrideForJob: Overrides[string] | undefined,
): EffectiveJobForOverrides {
  const effective: EffectiveJobForOverrides = {
    salary_min: baseJob.salary_min,
    salary_max: baseJob.salary_max,
    location_visa_supported: mapVisaSupportedValue(baseJob.location_visa_supported),
    tech_stack: [...baseJob.tech_stack],
  };

  if (!overrideForJob) return effective;

  if (overrideForJob.salary?.type === "overwrite") {
    const v = overrideForJob.salary.value;
    if (v && typeof v === "object") {
      effective.salary_min = typeof v.min === "number" ? v.min : null;
      effective.salary_max = typeof v.max === "number" ? v.max : null;
    } else {
      effective.salary_min = null;
      effective.salary_max = null;
    }
  }

  if (overrideForJob.visa_support?.type === "overwrite") {
    effective.location_visa_supported = overrideForJob.visa_support.value;
  }

  if (overrideForJob.tech_stack) {
    const removeSet = new Set(overrideForJob.tech_stack.remove || []);
    const addSet = new Set(overrideForJob.tech_stack.add || []);
    effective.tech_stack = effective.tech_stack
      .filter((t) => !removeSet.has(t))
      .concat(Array.from(addSet))
      .filter(Boolean);
    // unique while keeping stable order (base order first)
    const uniq = new Set<string>();
    effective.tech_stack = effective.tech_stack.filter((t) => {
      if (uniq.has(t)) return false;
      uniq.add(t);
      return true;
    });
  }

  return effective;
}

export function computeTechStackDiff(baseTechStack: string[], nextTechStack: string[]) {
  const baseSet = new Set(baseTechStack);
  const nextSet = new Set(nextTechStack);
  const add = nextTechStack.filter((t) => !baseSet.has(t));
  const remove = baseTechStack.filter((t) => !nextSet.has(t));
  return { add, remove };
}

