import { describe, expect, it } from "vitest";
import { formatSalaryAmount, formatSalaryRange } from "@/lib/formatSalary";

describe("formatSalaryAmount", () => {
  it("treats values under 1000 as already-in-thousands", () => {
    expect(formatSalaryAmount(30)).toBe("30");
    expect(formatSalaryAmount(120)).toBe("120");
  });

  it("converts full USD to k", () => {
    expect(formatSalaryAmount(30000)).toBe("30k");
    expect(formatSalaryAmount(120000)).toBe("120k");
  });
});

describe("formatSalaryRange", () => {
  it("formats thousand-scale ranges like the detail card", () => {
    expect(formatSalaryRange(30, 120)).toBe("$30 - $120");
  });

  it("formats full-USD ranges with k suffix", () => {
    expect(formatSalaryRange(30000, 120000)).toBe("$30k - $120k");
  });

  it("handles open ends", () => {
    expect(formatSalaryRange(30, null)).toBe("$30+");
    expect(formatSalaryRange(null, 120)).toBe("Up to $120");
  });
});
