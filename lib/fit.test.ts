import { describe, expect, it } from "vitest";
import { fit } from "@/lib/fit";
import type { FitJobInput } from "@/types/fit";
import type { UnifiedSignals } from "@/types/profile";

function baseJob(overrides: Partial<FitJobInput> = {}): FitJobInput {
  return {
    job_id: "j1",
    company_id: "c1",
    role_title: "Senior Engineer",
    level: "senior",
    location_city: null,
    location_country: "Russia",
    location_remote: 0,
    location_timezone: null,
    location_visa_supported: 0,
    salary_min: null,
    salary_max: null,
    industry: "SaaS",
    size: "51-200 people",
    funding_stage: "Series A",
    tech_stack: ["TypeScript", "React"],
    ...overrides,
  };
}

function emptySignals(
  overrides: Partial<UnifiedSignals> = {},
): UnifiedSignals {
  return {
    version: "1",
    updatedAt: 0,
    hardConstraints: {
      visa: { required: false },
      work: { modes: [] },
      locations: { allow: [] },
      employmentTypes: [],
    },
    capabilities: {
      skills: [],
      yearsOfExperience: 0,
      seniorityLevel: "mid",
    },
    preferences: {
      roles: [],
      skills: [],
      industries: [],
      companySizes: [],
      fundingStages: [],
    },
    rejections: { hard: {}, soft: {} },
    implicit: {
      inferredPreferences: {},
      behaviorMetrics: { bookmarkCount: 0, applyRate: 0 },
      decay: { halfLifeDays: 30, computedAt: 0 },
      lastUpdatedAt: 0,
    },
    ...overrides,
  };
}

describe("fit()", () => {
  it("hard-fails when visa is required but unsupported", () => {
    const result = fit(
      baseJob({ location_visa_supported: 0 }),
      emptySignals({
        hardConstraints: {
          visa: { required: true },
          work: { modes: [] },
          locations: { allow: [] },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.fitScore).toBe(0);
    expect(result.hardFailReasons).toContain("visa_constraint");
  });

  it("does not treat country 'us' as a substring match for 'russia'", () => {
    const result = fit(
      baseJob({ location_country: "Russia" }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: [] },
          locations: {
            allow: [{ scope: "country", id: "US" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("exact-matches short country codes like US", () => {
    const result = fit(
      baseJob({ location_country: "US" }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: [] },
          locations: {
            allow: [{ scope: "country", id: "US" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(false);
  });

  it("passes location for remote jobs when work.modes includes remote", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "South Asia" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(false);
    expect(result.hardFailReasons).not.toContain("location_constraint");
    expect(result.hardFailReasons).not.toContain("work_mode_constraint");
  });

  it("still hard-fails onsite jobs outside the allow-list even if remote is accepted", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote", "hybrid"] },
          locations: {
            allow: [{ scope: "country", id: "South Asia", remoteOk: true }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("treats legacy location tag 'Remote' as accepting remote jobs", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: [] },
          locations: {
            allow: [
              { scope: "country", id: "South Asia" },
              { scope: "country", id: "Remote" },
            ],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("does not match skill 'go' against 'Google Cloud Platform'", () => {
    const withGoPref = emptySignals({
      preferences: {
        roles: [],
        skills: [{ value: "go", weight: 1, source: "explicit" }],
        industries: [],
        companySizes: [],
        fundingStages: [],
      },
    });
    const miss = fit(
      baseJob({ tech_stack: ["Google Cloud Platform"] }),
      withGoPref,
    );
    const hit = fit(baseJob({ tech_stack: ["Go"] }), withGoPref);

    const missSkill = miss.factorBreakdown.find(
      (f) => f.key === "preference_skill_match",
    );
    const hitSkill = hit.factorBreakdown.find(
      (f) => f.key === "preference_skill_match",
    );
    expect(missSkill?.score).toBe(0);
    expect(hitSkill?.score).toBe(1);
    expect(hit.fitScore).toBeGreaterThan(miss.fitScore);
  });

  it("scores via capability level when preferences are empty", () => {
    const result = fit(baseJob({ level: "senior" }), emptySignals());
    expect(result.hardFail).toBe(false);
    // mid → senior distance 1 → level score 2/3 → ~67
    expect(result.fitScore).toBe(67);
    expect(
      result.factorBreakdown.some((f) => f.key === "capability_level_match"),
    ).toBe(true);
  });

  it("handles unknown salary without crashing", () => {
    const result = fit(
      baseJob({ salary_min: null, salary_max: null }),
      emptySignals({
        preferences: {
          roles: [],
          skills: [],
          industries: [],
          companySizes: [],
          fundingStages: [],
          salary: { min: 100000, currency: "USD", weight: 0.5 },
        },
      }),
    );
    expect(result.hardFail).toBe(false);
    expect(result.fitScore).toBeGreaterThanOrEqual(0);
    expect(result.fitScore).toBeLessThanOrEqual(100);
  });
});
