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
});
