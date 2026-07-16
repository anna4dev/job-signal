import { describe, expect, it } from "vitest";
import {
  buildCompanyEvidenceHints,
  computeCompanyMomentum,
} from "@/lib/companyEvidenceMath";
import { parseTechStackField } from "@/lib/parseJobFields";

const MS_DAY = 24 * 60 * 60 * 1000;

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

describe("company evidence stack parsing", () => {
  it("aggregates job tech stacks via parseTechStackField", () => {
    const jobs = ['["Python","React"]', '["Python","Go"]', "[]", null];
    const map = new Map<string, number>();
    let withStack = 0;
    for (const raw of jobs) {
      const stack = parseTechStackField(raw);
      if (stack.length === 0) continue;
      withStack += 1;
      for (const tech of stack) {
        map.set(tech, (map.get(tech) || 0) + 1);
      }
    }
    expect(withStack).toBe(2);
    expect(map.get("Python")).toBe(2);
  });
});
