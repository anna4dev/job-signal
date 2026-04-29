import type {
  ExplicitProfile,
  HardConstraints,
  Capabilities,
  Preferences,
  Rejections,
} from "@/types/profile";

export const PROFILE_KEY = "explicit_profile_v1";
export const PROFILE_EVENT = "profile-change";

function defaultHardConstraints(): HardConstraints {
  return {
    visa: { required: false },
    work: { modes: [] },
    locations: { allow: [] },
    employmentTypes: [],
  };
}

function defaultCapabilities(): Capabilities {
  return {
    skills: [],
    yearsOfExperience: 0,
    seniorityLevel: "mid",
    domains: [],
    languages: [],
  };
}

function defaultPreferences(): Preferences {
  return {
    roles: [],
    skills: [],
    industries: [],
    companySizes: [],
    fundingStages: [],
    workMode: [],
  };
}

function defaultRejections(): Rejections {
  return {
    hard: {},
    soft: {},
  };
}

export function defaultExplicitProfile(): ExplicitProfile {
  return {
    version: "1",
    updatedAt: Date.now(),
    hardConstraints: defaultHardConstraints(),
    capabilities: defaultCapabilities(),
    preferences: defaultPreferences(),
    rejections: defaultRejections(),
  };
}

// ── Per-section coercion (deep-merge with defaults at each leaf) ─────────────
// A stored payload like `{ "hardConstraints": {} }` must NOT leave nested fields
// (work.modes, locations.allow, employmentTypes) undefined — UI reads these paths
// unguarded.

function coerceHardConstraints(p: unknown): HardConstraints {
  const def = defaultHardConstraints();
  if (!p || typeof p !== "object") return def;
  const obj = p as Partial<HardConstraints>;
  return {
    visa: { required: obj.visa?.required === true },
    work: {
      modes: Array.isArray(obj.work?.modes) ? obj.work!.modes : def.work.modes,
      timezoneOverlap: obj.work?.timezoneOverlap,
    },
    locations: {
      allow: Array.isArray(obj.locations?.allow)
        ? obj.locations!.allow
        : def.locations.allow,
    },
    employmentTypes: Array.isArray(obj.employmentTypes)
      ? obj.employmentTypes
      : def.employmentTypes,
  };
}

function coerceCapabilities(p: unknown): Capabilities {
  const def = defaultCapabilities();
  if (!p || typeof p !== "object") return def;
  const obj = p as Partial<Capabilities>;
  return {
    skills: Array.isArray(obj.skills) ? obj.skills : def.skills,
    yearsOfExperience:
      typeof obj.yearsOfExperience === "number"
        ? obj.yearsOfExperience
        : def.yearsOfExperience,
    seniorityLevel: obj.seniorityLevel ?? def.seniorityLevel,
    domains: Array.isArray(obj.domains) ? obj.domains : def.domains,
    languages: Array.isArray(obj.languages) ? obj.languages : def.languages,
  };
}

function coercePreferences(p: unknown): Preferences {
  const def = defaultPreferences();
  if (!p || typeof p !== "object") return def;
  const obj = p as Partial<Preferences>;
  return {
    roles: Array.isArray(obj.roles) ? obj.roles : def.roles,
    skills: Array.isArray(obj.skills) ? obj.skills : def.skills,
    industries: Array.isArray(obj.industries) ? obj.industries : def.industries,
    companySizes: Array.isArray(obj.companySizes)
      ? obj.companySizes
      : def.companySizes,
    fundingStages: Array.isArray(obj.fundingStages)
      ? obj.fundingStages
      : def.fundingStages,
    workMode: Array.isArray(obj.workMode) ? obj.workMode : def.workMode,
    salary: obj.salary,
  };
}

function coerceRejections(p: unknown): Rejections {
  const def = defaultRejections();
  if (!p || typeof p !== "object") return def;
  const obj = p as Partial<Rejections>;
  return {
    hard:
      obj.hard && typeof obj.hard === "object" ? obj.hard : def.hard,
    soft:
      obj.soft && typeof obj.soft === "object" ? obj.soft : def.soft,
  };
}

export function readExplicitProfile(): ExplicitProfile {
  if (typeof window === "undefined") return defaultExplicitProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultExplicitProfile();
    const parsed = JSON.parse(raw) as Partial<ExplicitProfile>;
    if (parsed.version !== "1") return defaultExplicitProfile();
    return {
      version: "1",
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      hardConstraints: coerceHardConstraints(parsed.hardConstraints),
      capabilities: coerceCapabilities(parsed.capabilities),
      preferences: coercePreferences(parsed.preferences),
      rejections: coerceRejections(parsed.rejections),
    };
  } catch {
    return defaultExplicitProfile();
  }
}

// Returns true on successful persistence; false when localStorage is unavailable
// (private mode / quota exceeded / SSR). Callers should surface failures to the
// user — silent failure leads to false "Saved" confirmations.
export function writeExplicitProfile(profile: ExplicitProfile): boolean {
  if (typeof window === "undefined") return false;
  const next: ExplicitProfile = { ...profile, updatedAt: Date.now() };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PROFILE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearExplicitProfile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event(PROFILE_EVENT));
    return true;
  } catch {
    return false;
  }
}

// True only when no field carries user data. Must consider every persisted field
// — visa / locations / employment types / salary / rejections all count.
export function isProfileEmpty(profile: ExplicitProfile): boolean {
  const { hardConstraints: hc, capabilities: cap, preferences: pref, rejections: rej } =
    profile;

  return (
    !hc.visa.required &&
    hc.work.modes.length === 0 &&
    hc.locations.allow.length === 0 &&
    hc.employmentTypes.length === 0 &&
    cap.skills.length === 0 &&
    cap.yearsOfExperience === 0 &&
    (cap.domains?.length ?? 0) === 0 &&
    (cap.languages?.length ?? 0) === 0 &&
    pref.roles.length === 0 &&
    pref.skills.length === 0 &&
    pref.industries.length === 0 &&
    pref.companySizes.length === 0 &&
    pref.fundingStages.length === 0 &&
    !pref.salary &&
    !rej.hard.companyIds?.length &&
    !rej.hard.industries?.length &&
    !rej.soft.skills?.length &&
    !rej.soft.companyTypes?.length &&
    !(rej.soft.noOncall && rej.soft.noOncall > 0)
  );
}
