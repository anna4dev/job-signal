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
  });

  it("normalizes node/next/react aliases", () => {
    expect(normalizeSkillKey("Node.js")).toBe("nodejs");
    expect(normalizeSkillKey("node")).toBe("nodejs");
    expect(normalizeSkillKey("Next.js")).toBe("nextjs");
    expect(normalizeSkillKey("React.js")).toBe("react");
    expect(normalizeSkillKey("TypeScript")).toBe("typescript");
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
});
