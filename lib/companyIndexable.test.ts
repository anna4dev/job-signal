import { describe, expect, it } from "vitest";
import {
  countNonAdjacentMonthPosts,
  isAnonymousCompanyName,
  isCompanyIndexable,
} from "@/lib/companyIndexable";

describe("isAnonymousCompanyName", () => {
  it("flags placeholders", () => {
    expect(isAnonymousCompanyName("Anonymous")).toBe(true);
    expect(isAnonymousCompanyName("stealth")).toBe(true);
    expect(isAnonymousCompanyName("")).toBe(true);
    expect(isAnonymousCompanyName("Acme Corp")).toBe(false);
  });
});

describe("countNonAdjacentMonthPosts", () => {
  it("counts only months with a partner at distance >= 2", () => {
    // Jan↔Mar distance is 2, so endpoints count; Feb is only adjacent.
    expect(countNonAdjacentMonthPosts(["2024-01", "2024-02", "2024-03"])).toBe(
      2,
    );
    expect(countNonAdjacentMonthPosts(["2024-01", "2024-03", "2024-05"])).toBe(
      3,
    );
    expect(countNonAdjacentMonthPosts(["2024-01", "2024-03"])).toBe(2);
  });
});

describe("isCompanyIndexable", () => {
  it("requires jobCount > 2, cross-month, and nonAdjacentMonthPostCount > 2", () => {
    expect(
      isCompanyIndexable({
        companyName: "Acme",
        jobCount: 5,
        postingMonths: ["2024-01", "2024-03", "2024-05"],
      }),
    ).toBe(true);

    expect(
      isCompanyIndexable({
        companyName: "Acme",
        jobCount: 2,
        postingMonths: ["2024-01", "2024-03", "2024-05"],
      }),
    ).toBe(false);

    expect(
      isCompanyIndexable({
        companyName: "Acme",
        jobCount: 5,
        postingMonths: ["2024-01", "2024-02", "2024-03"],
      }),
    ).toBe(false);

    expect(
      isCompanyIndexable({
        companyName: "Anonymous",
        jobCount: 10,
        postingMonths: ["2024-01", "2024-03", "2024-05"],
      }),
    ).toBe(false);

    expect(
      isCompanyIndexable({
        companyName: "Acme",
        jobCount: 5,
        postingMonths: ["2024-01", "2024-03"],
      }),
    ).toBe(false);
  });
});
