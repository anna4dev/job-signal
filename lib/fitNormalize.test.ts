import { describe, expect, it } from "vitest";
import {
  expandSkillLabels,
  normalizeSkillKey,
  roleTitleMatches,
  skillPreferredMatchesJob,
} from "@/lib/fitNormalize";

describe("fitNormalize skills", () => {
  it("expands slash and parenthetical compounds", () => {
    expect(expandSkillLabels("React/Next.js (TypeScript)")).toEqual([
      "React",
      "Next.js",
      "TypeScript",
    ]);
    expect(expandSkillLabels("TypeScript/Node.js")).toEqual([
      "TypeScript",
      "Node.js",
    ]);
    expect(expandSkillLabels("Node.js (TypeScript)")).toEqual([
      "Node.js",
      "TypeScript",
    ]);
    expect(expandSkillLabels("Node Or Python")).toEqual(["Node", "Python"]);
  });

  it("normalizes node/next/react aliases", () => {
    expect(normalizeSkillKey("Node.js")).toBe("nodejs");
    expect(normalizeSkillKey("node")).toBe("nodejs");
    expect(normalizeSkillKey("Next.js")).toBe("nextjs");
    expect(normalizeSkillKey("React.js")).toBe("react");
    expect(normalizeSkillKey("TypeScript")).toBe("typescript");
    expect(normalizeSkillKey("Typescript Strict")).toBe("typescript");
    expect(normalizeSkillKey(".NET 8")).toBe("dotnet");
    expect(normalizeSkillKey("Asp.net Core")).toBe("dotnet");
    expect(normalizeSkillKey("C# .NET")).toBe("dotnet");
  });

  it("matches .NET profile chip against versioned job stack labels", () => {
    expect(skillPreferredMatchesJob(".NET", [".NET 8", "React"])).toBe(true);
    expect(
      skillPreferredMatchesJob(".NET", ["Asp.net Core", "TypeScript"]),
    ).toBe(true);
  });

  it("keeps Route 53 and Route53 as the same key after version strip", () => {
    expect(normalizeSkillKey("Route 53")).toBe("route53");
    expect(normalizeSkillKey("Route53")).toBe("route53");
  });

  it("does not rewrite Internet as .NET", () => {
    expect(normalizeSkillKey("Internet")).not.toBe("dotnet");
  });

  it("matches profile React against compound job stack labels", () => {
    expect(
      skillPreferredMatchesJob("React", [
        "React/Next.js (TypeScript)",
        "Node.js (TypeScript)",
      ]),
    ).toBe(true);
    expect(
      skillPreferredMatchesJob("TypeScript", ["React/TypeScript"]),
    ).toBe(true);
    expect(skillPreferredMatchesJob("Go", ["Google Cloud Platform"])).toBe(
      false,
    );
  });
});

describe("fitNormalize roles", () => {
  it("treats front-end variants as the same family", () => {
    const title = "Senior Front-End Software Engineer";
    for (const role of [
      "front-end developer",
      "front-end engineer",
      "frontend developer",
      "front end engineer",
    ]) {
      expect(roleTitleMatches(title, role), role).toBe(true);
    }
  });

  it("still distinguishes frontend from backend", () => {
    expect(
      roleTitleMatches("Backend Engineer", "frontend developer"),
    ).toBe(false);
  });

  it("matches founding / co-founder title variants", () => {
    expect(
      roleTitleMatches("AI Founding Engineer", "Founding Engineer"),
    ).toBe(true);
    expect(
      roleTitleMatches("2nd Founding Engineer", "Founding Engineer"),
    ).toBe(true);
    expect(roleTitleMatches("CTO Co-Founder", "CTO / Co-Founder")).toBe(true);
    expect(roleTitleMatches("Co-Founder", "Co-Founder")).toBe(true);
    expect(
      roleTitleMatches("Founders Associate", "Founder's Associate"),
    ).toBe(true);
  });

  it("matches ML / DevOps write-side chips against JD title variants", () => {
    expect(
      roleTitleMatches("Machine Learning Engineer", "ML Engineer"),
    ).toBe(true);
    expect(roleTitleMatches("ML Engineer", "ML Engineer")).toBe(true);
    expect(roleTitleMatches("Senior SRE", "DevOps Engineer")).toBe(true);
    expect(
      roleTitleMatches("Site Reliability Engineer", "DevOps Engineer"),
    ).toBe(true);
    expect(
      roleTitleMatches("Platform Engineer", "DevOps Engineer"),
    ).toBe(true);
  });
});
