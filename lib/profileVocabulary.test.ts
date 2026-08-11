import { describe, expect, it } from "vitest";
import {
  canonicalizeRolesForProfile,
  canonicalizeSkillsForProfile,
} from "@/lib/profileVocabulary";

describe("profileVocabulary skills", () => {
  it("收口 compound stack into atomic canonical chips", () => {
    expect(canonicalizeSkillsForProfile("React/Next.js (TypeScript)")).toEqual([
      "React",
      "Next.js",
      "TypeScript",
    ]);
    expect(canonicalizeSkillsForProfile("Node.js (TypeScript)")).toEqual([
      "Node.js",
      "TypeScript",
    ]);
    expect(canonicalizeSkillsForProfile("nodejs")).toEqual(["Node.js"]);
  });
});

describe("profileVocabulary roles", () => {
  it("收口 frontend title variants to one chip", () => {
    for (const raw of [
      "front-end developer",
      "front-end engineer",
      "front-end software engineer",
      "frontend developer",
    ]) {
      expect(canonicalizeRolesForProfile(raw)).toEqual(["Frontend Engineer"]);
    }
  });

  it("can emit fullstack + product from a compound label", () => {
    expect(
      canonicalizeRolesForProfile("ai product engineer (fullstack)"),
    ).toEqual(["Fullstack Engineer", "Product Engineer"]);
  });

  it("收口 founder associate spellings", () => {
    for (const raw of [
      "Founder's Associate",
      "Founder Associate",
      "Founders Associate",
    ]) {
      expect(canonicalizeRolesForProfile(raw)).toEqual(["Founder's Associate"]);
    }
  });

  it("收口 co-founder / CTO combinations", () => {
    expect(canonicalizeRolesForProfile("cto co-founder")).toEqual([
      "CTO / Co-Founder",
    ]);
    expect(canonicalizeRolesForProfile("co-founder cto")).toEqual([
      "CTO / Co-Founder",
    ]);
    expect(canonicalizeRolesForProfile("co-founder")).toEqual(["Co-Founder"]);
  });

  it("收口 founding engineer variants", () => {
    expect(canonicalizeRolesForProfile("2nd founding engineer")).toEqual([
      "Founding Engineer",
    ]);
    expect(canonicalizeRolesForProfile("ai founding engineer")).toEqual([
      "Founding Engineer",
    ]);
  });

  it("收口 AI / Bayesian software engineer labels", () => {
    expect(canonicalizeRolesForProfile("AI native software engineer")).toEqual([
      "AI Software Engineer",
    ]);
    expect(canonicalizeRolesForProfile("ai software engineer")).toEqual([
      "AI Software Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Bayesian software engineer")).toEqual([
      "Bayesian Software Engineer",
    ]);
    expect(
      canonicalizeRolesForProfile("Bayesian software engineering"),
    ).toEqual(["Bayesian Software Engineer"]);
  });
});
