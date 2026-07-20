import { describe, expect, it } from "vitest";
import {
  buildCompanySignalConsistency,
  buildCompanyTrajectory,
} from "@/lib/companyLongHorizonMath";
import type { CompanyJobAggregateRow } from "@/lib/companyJobRows";

function row(
  partial: Partial<CompanyJobAggregateRow> & { post_at: string },
): CompanyJobAggregateRow {
  return {
    job_id: partial.job_id ?? "j",
    level: partial.level ?? "senior",
    location_remote: partial.location_remote ?? 0,
    location_visa_supported: partial.location_visa_supported ?? 0,
    salary_min: partial.salary_min ?? null,
    salary_max: partial.salary_max ?? null,
    post_at: partial.post_at,
    tech_stack: partial.tech_stack ?? null,
  };
}

describe("buildCompanyTrajectory", () => {
  it("buckets jobs by YYYY-MM", () => {
    const trajectory = buildCompanyTrajectory([
      row({ post_at: "2026-01-10T00:00:00.000Z", location_remote: 1 }),
      row({ post_at: "2026-01-20T00:00:00.000Z" }),
      row({ post_at: "2026-03-01T00:00:00.000Z", salary_min: 100 }),
    ]);
    expect(trajectory).toHaveLength(2);
    expect(trajectory[0].month).toBe("2026-01");
    expect(trajectory[0].jobCount).toBe(2);
    expect(trajectory[0].remoteShare).toBe(50);
    expect(trajectory[1].month).toBe("2026-03");
    expect(trajectory[1].salaryCoverage).toBe(100);
  });
});

describe("buildCompanySignalConsistency", () => {
  it("flags sparse history", () => {
    const c = buildCompanySignalConsistency([
      row({ post_at: "2026-01-01T00:00:00.000Z" }),
      row({ post_at: "2026-02-01T00:00:00.000Z" }),
    ]);
    expect(c.notes[0]).toMatch(/Fewer than 4/);
  });

  it("scores stable remote shares highly", () => {
    const rows = [
      row({ post_at: "2025-01-01T00:00:00.000Z", location_remote: 1 }),
      row({ post_at: "2025-02-01T00:00:00.000Z", location_remote: 1 }),
      row({ post_at: "2025-03-01T00:00:00.000Z", location_remote: 1 }),
      row({ post_at: "2025-04-01T00:00:00.000Z", location_remote: 1 }),
    ];
    const c = buildCompanySignalConsistency(rows);
    expect(c.score).toBeGreaterThanOrEqual(80);
    expect(c.remoteEarly).toBe(100);
    expect(c.remoteLate).toBe(100);
  });
});
