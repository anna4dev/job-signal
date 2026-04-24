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

export function readExplicitProfile(): ExplicitProfile {
  if (typeof window === "undefined") return defaultExplicitProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultExplicitProfile();
    const parsed = JSON.parse(raw) as Partial<ExplicitProfile>;
    if (parsed.version !== "1") return defaultExplicitProfile();
    // Forward-compatible merge: missing fields fall back to defaults
    return {
      version: "1",
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      hardConstraints: parsed.hardConstraints ?? defaultHardConstraints(),
      capabilities: parsed.capabilities ?? defaultCapabilities(),
      preferences: parsed.preferences ?? defaultPreferences(),
      rejections: parsed.rejections ?? defaultRejections(),
    };
  } catch {
    return defaultExplicitProfile();
  }
}

export function writeExplicitProfile(profile: ExplicitProfile): void {
  if (typeof window === "undefined") return;
  const next: ExplicitProfile = { ...profile, updatedAt: Date.now() };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PROFILE_EVENT));
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded)
  }
}

export function clearExplicitProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event(PROFILE_EVENT));
  } catch {
    // ignore
  }
}

export function isProfileEmpty(profile: ExplicitProfile): boolean {
  return (
    profile.capabilities.skills.length === 0 &&
    profile.preferences.roles.length === 0 &&
    profile.hardConstraints.work.modes.length === 0 &&
    profile.preferences.industries.length === 0
  );
}
