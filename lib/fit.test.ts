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

  it("matches Germany under an EU region allow-list", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_city: "Berlin",
        location_remote: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "region", id: "EU" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("matches Germany when EU was saved as scope country", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_remote: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "country", id: "EU" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("hard-fails a non-EU country against an EU allow-list", () => {
    const result = fit(
      baseJob({
        location_country: "Singapore",
        location_remote: 0,
        work_style: "onsite",
        location_visa_supported: 0,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "region", id: "EU" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("hard-fails United States against a Europe allow-list", () => {
    // Pins exact membership: must not fuzzy-match via member "united kingdom".
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 0,
        work_style: "onsite",
        location_visa_supported: 0,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "region", id: "Europe" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("matches UAE under an EMEA allow-list", () => {
    const result = fit(
      baseJob({
        location_country: "United Arab Emirates",
        location_remote: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "region", id: "EMEA" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("still hard-fails work mode when profile is remote-only for Berlin onsite", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_city: "Berlin",
        location_remote: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "region", id: "EU" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).toContain("work_mode_constraint");
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("hard-fails US remote against a Singapore location allow-list", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 1,
        location_visa_supported: 0,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("passes Singapore remote against a Singapore allow-list", () => {
    const result = fit(
      baseJob({
        location_country: "Singapore",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("hard-fails US onsite/hybrid without visa for a Singapore profile", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 0,
        location_visa_supported: 0,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite", "hybrid"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("passes US onsite with visa for a Singapore profile location", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 0,
        location_visa_supported: 1,
        work_style: "onsite",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["onsite"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("passes UK hybrid with visa for a non-UK profile location", () => {
    const result = fit(
      baseJob({
        location_country: "United Kingdom",
        location_remote: 0,
        location_visa_supported: 1,
        work_style: "hybrid",
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["hybrid"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("does not let job visa bypass location for US remote", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 1,
        location_visa_supported: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("passes remote with no country/city regardless of profile locations", () => {
    const result = fit(
      baseJob({
        location_country: null,
        location_city: null,
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("passes remote with placeholder worldwide country", () => {
    const result = fit(
      baseJob({
        location_country: "Worldwide",
        location_city: null,
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("passes remote with placeholder worldwide city and no country", () => {
    const result = fit(
      baseJob({
        location_country: null,
        location_city: "Worldwide",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore" }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("treats legacy location tag 'Remote' as remote-anywhere only", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [
              { scope: "country", id: "Singapore" },
              { scope: "country", id: "Remote" },
            ],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("treats profile-persisted remote_tz Remote as remote-anywhere", () => {
    const result = fit(
      baseJob({
        location_country: "Germany",
        location_remote: 1,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [
              { scope: "country", id: "Singapore" },
              { scope: "remote_tz", id: "Remote" },
            ],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("location_constraint");
  });

  it("does not treat remoteOk on a country as worldwide remote eligibility", () => {
    const result = fit(
      baseJob({
        location_country: "United States",
        location_remote: 1,
        location_visa_supported: 0,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: {
            allow: [{ scope: "country", id: "Singapore", remoteOk: true }],
          },
          employmentTypes: [],
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.hardFailReasons).toContain("location_constraint");
  });

  it("hard-fails CEO when target roles are engineering titles", () => {
    const result = fit(
      baseJob({
        role_title: "CEO",
        location_remote: 1,
        location_country: null,
        tech_stack: [],
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: { allow: [] },
          employmentTypes: [],
        },
        preferences: {
          roles: [{ value: "Product Engineer", weight: 1, source: "explicit" }],
          skills: [{ value: "TypeScript", weight: 1, source: "explicit" }],
          industries: [{ value: "SaaS", weight: 1, source: "explicit" }],
          companySizes: [],
          fundingStages: [],
        },
        capabilities: {
          skills: [{ value: "TypeScript", weight: 1, source: "explicit" }],
          yearsOfExperience: 5,
          seniorityLevel: "senior",
        },
      }),
    );
    expect(result.hardFail).toBe(true);
    expect(result.fitScore).toBe(0);
    expect(result.hardFailReasons).toContain("role_constraint");
    expect(result.reasonTags).toContain("Role mismatch");
  });

  it("role hard-gate ignores zero weight when title matches", () => {
    const result = fit(
      baseJob({
        role_title: "Product Engineer",
        location_remote: 1,
        location_country: null,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: { allow: [] },
          employmentTypes: [],
        },
        preferences: {
          roles: [
            { value: "Product Engineer", weight: 0, source: "explicit" },
          ],
          skills: [],
          industries: [],
          companySizes: [],
          fundingStages: [],
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("role_constraint");
    expect(result.hardFail).toBe(false);
  });

  it("soft-rejected skills do not also emit positive skill factors", () => {
    const result = fit(
      baseJob({
        location_remote: 1,
        location_country: null,
        tech_stack: ["PHP", "React"],
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: { allow: [] },
          employmentTypes: [],
        },
        preferences: {
          roles: [],
          skills: [{ value: "PHP", weight: 1, source: "explicit" }],
          industries: [],
          companySizes: [],
          fundingStages: [],
        },
        capabilities: {
          skills: [{ value: "PHP", weight: 1, source: "explicit" }],
          yearsOfExperience: 5,
          seniorityLevel: "senior",
        },
        rejections: {
          soft: {
            skills: [{ value: "PHP", weight: 1, source: "explicit" }],
          },
          hard: {},
        },
      }),
    );
    const keys = result.factorBreakdown.map((f) => f.key);
    expect(keys).toContain("soft_rejection_skill");
    expect(keys).not.toContain("preference_skill_match");
    expect(keys).not.toContain("capability_skill_match");
  });

  it("does not hard-fail on implicit-only roles when explicit Target roles are empty", () => {
    const result = fit(
      baseJob({
        role_title: "Senior Fullstack Engineer",
        location_remote: 1,
        location_country: null,
        tech_stack: ["React"],
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: { allow: [] },
          employmentTypes: [],
        },
        preferences: {
          roles: [{ value: "CEO", weight: 0.2, source: "implicit" }],
          skills: [],
          industries: [],
          companySizes: [],
          fundingStages: [],
        },
        capabilities: {
          skills: [{ value: "React", weight: 1, source: "explicit" }],
          yearsOfExperience: 5,
          seniorityLevel: "senior",
        },
      }),
    );
    expect(result.hardFailReasons).not.toContain("role_constraint");
    expect(result.hardFail).toBe(false);
  });

  it("matches full stack / fullstack aliases against Senior Fullstack Engineer", () => {
    for (const role of [
      "fullstack",
      "Full Stack",
      "ai / fullstack",
      "ai product engineer (fullstack)",
    ]) {
      const result = fit(
        baseJob({
          role_title: "Senior Fullstack Engineer",
          location_remote: 1,
          location_country: null,
          tech_stack: ["React"],
        }),
        emptySignals({
          hardConstraints: {
            visa: { required: false },
            work: { modes: ["remote"] },
            locations: { allow: [] },
            employmentTypes: [],
          },
          preferences: {
            roles: [{ value: role, weight: 1, source: "explicit" }],
            skills: [],
            industries: [],
            companySizes: [],
            fundingStages: [],
          },
        }),
      );
      expect(result.hardFailReasons, role).not.toContain("role_constraint");
    }
  });

  it("does not let zero industry/size drag down a strong role+stack match", () => {
    const result = fit(
      baseJob({
        role_title: "Full Stack AI Engineer",
        level: "senior",
        location_remote: 1,
        location_country: null,
        tech_stack: [
          "Next.js",
          "React",
          "TypeScript",
          "Node.js",
          "PostgreSQL",
          "Docker",
        ],
        industry: "Other",
        size: "1-10 people",
        salary_min: 30000,
        salary_max: 90000,
      }),
      emptySignals({
        hardConstraints: {
          visa: { required: false },
          work: { modes: ["remote"] },
          locations: { allow: [] },
          employmentTypes: [],
        },
        preferences: {
          roles: [
            { value: "Full Stack Engineer", weight: 1, source: "explicit" },
          ],
          skills: [
            { value: "React", weight: 0.25, source: "explicit" },
            { value: "TypeScript", weight: 0.25, source: "explicit" },
            { value: "Next.js", weight: 0.25, source: "explicit" },
            { value: "Node.js", weight: 0.25, source: "explicit" },
          ],
          industries: [{ value: "SaaS", weight: 1, source: "explicit" }],
          companySizes: [
            { value: "201-500 people", weight: 1, source: "explicit" },
          ],
          fundingStages: [],
        },
        capabilities: {
          skills: [
            { value: "React", weight: 1, source: "explicit" },
            { value: "TypeScript", weight: 1, source: "explicit" },
            { value: "Next.js", weight: 1, source: "explicit" },
            { value: "Node.js", weight: 1, source: "explicit" },
          ],
          yearsOfExperience: 5,
          seniorityLevel: "senior",
        },
      }),
    );
    expect(result.hardFail).toBe(false);
    expect(result.fitScore).toBeGreaterThanOrEqual(70);
  });

  it("scores skill mismatch far below level/industry when roles are empty", () => {
    const engOnly = emptySignals({
      capabilities: {
        skills: [
          { value: "TypeScript", weight: 1, source: "explicit" },
          { value: "React", weight: 1, source: "explicit" },
        ],
        yearsOfExperience: 5,
        seniorityLevel: "senior",
      },
      preferences: {
        roles: [],
        skills: [],
        industries: [{ value: "SaaS", weight: 1, source: "explicit" }],
        companySizes: [],
        fundingStages: [],
      },
    });
    const ceo = fit(
      baseJob({
        role_title: "CEO",
        level: "unknown",
        location_remote: 1,
        location_country: null,
        tech_stack: [],
        industry: "SaaS",
      }),
      engOnly,
    );
    const eng = fit(
      baseJob({
        role_title: "Senior Engineer",
        level: "senior",
        tech_stack: ["TypeScript", "React"],
        industry: "SaaS",
      }),
      engOnly,
    );
    expect(ceo.hardFail).toBe(false);
    expect(ceo.fitScore).toBeLessThan(25);
    expect(eng.fitScore).toBeGreaterThan(ceo.fitScore);
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
