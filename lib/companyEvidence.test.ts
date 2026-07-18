import { describe, expect, it } from "vitest";
import { buildCompanyEvidenceFromRows } from "@/lib/companyAggregates";
import {
  buildCompanyEvidenceHints,
  computeCompanyMomentum,
} from "@/lib/companyEvidenceMath";
import type { CompanyJobAggregateRow } from "@/lib/companyJobRows";

const MS_DAY = 24 * 60 * 60 * 1000;

function row(
  partial: Partial<CompanyJobAggregateRow> & { post_at: string | null },
): CompanyJobAggregateRow {
  return {
    job_id: partial.job_id ?? "j1",
    level: partial.level ?? "senior",
    location_remote: partial.location_remote ?? 0,
    location_visa_supported: partial.location_visa_supported ?? 0,
    salary_min: partial.salary_min ?? null,
    salary_max: partial.salary_max ?? null,
    post_at: partial.post_at,
    tech_stack: partial.tech_stack ?? null,
  };
}

describe("computeCompanyMomentum", () => {
  const now = Date.UTC(2026, 6, 15); // 2026-07-15

  it("counts 30/90 windows and prior windows", () => {
    const times = [
      now - 5 * MS_DAY,
      now - 40 * MS_DAY,
      now - 100 * MS_DAY,
      now - 20 * MS_DAY,
    ];
    const m = computeCompanyMomentum(times, now);
    expect(m.jobs30d).toBe(2);
    expect(m.jobs90d).toBe(3);
    expect(m.jobsPrev30d).toBe(1);
    expect(m.jobsPrev90d).toBe(1);
    expect(m.delta30d).toBe(1);
    expect(m.delta90d).toBe(2);
  });

  it("returns null deltas when both windows empty", () => {
    const m = computeCompanyMomentum([], now);
    expect(m.jobs30d).toBe(0);
    expect(m.delta30d).toBeNull();
    expect(m.delta90d).toBeNull();
  });
});

describe("buildCompanyEvidenceHints", () => {
  it("flags stale 30-day window", () => {
    const hints = buildCompanyEvidenceHints(
      {
        jobs30d: 0,
        jobs90d: 3,
        jobsPrev30d: 2,
        jobsPrev90d: 1,
        delta30d: -2,
        delta90d: 2,
      },
      5,
      {
        remote: 50,
        visa: 10,
        salary: 80,
        techStack: 80,
        level: 90,
      },
    );
    expect(hints.some((h) => h.includes("last 30 days"))).toBe(true);
  });
});

describe("buildCompanyEvidenceFromRows", () => {
  const now = Date.UTC(2026, 6, 15);

  it("aggregates job tech stacks and coverage via the production path", () => {
    const rows = [
      row({
        job_id: "a",
        post_at: new Date(now - 5 * MS_DAY).toISOString(),
        tech_stack: '["Python","React"]',
        salary_min: 100,
        location_remote: 1,
      }),
      row({
        job_id: "b",
        post_at: new Date(now - 20 * MS_DAY).toISOString(),
        tech_stack: '["Python","Go"]',
        level: "mid",
      }),
      row({
        job_id: "c",
        post_at: new Date(now - 40 * MS_DAY).toISOString(),
        tech_stack: "[]",
        level: "unknown",
      }),
    ];

    const evidence = buildCompanyEvidenceFromRows(rows, "HN", now);
    expect(evidence.sampleSize).toBe(3);
    expect(evidence.coverage.techStack).toBe(67);
    expect(evidence.coverage.salary).toBe(33);
    expect(evidence.coverage.remote).toBe(33);
    expect(evidence.jobTechStack.find((t) => t.tech === "Python")?.count).toBe(
      2,
    );
    expect(evidence.momentum.jobs30d).toBe(2);
    expect(evidence.momentum.jobsPrev30d).toBe(1);
  });
});
