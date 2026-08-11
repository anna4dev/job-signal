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

  it("收口 AI delivery / associate / systems / agent titles", () => {
    expect(canonicalizeRolesForProfile("Ai Delivery Intern")).toEqual([
      "AI Delivery",
    ]);
    expect(canonicalizeRolesForProfile("Ai Delivery Lead")).toEqual([
      "AI Delivery",
    ]);
    expect(canonicalizeRolesForProfile("Ai Development associate")).toEqual([
      "AI Associate",
    ]);
    expect(canonicalizeRolesForProfile("Ai Associate")).toEqual([
      "AI Associate",
    ]);
    expect(canonicalizeRolesForProfile("Ai system engineer")).toEqual([
      "AI Systems Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Ai agent engineer")).toEqual([
      "AI Agent Engineer",
    ]);
  });

  it("收口 AI research and inference specialty titles", () => {
    for (const raw of [
      "Ai research engineer",
      "Ai Research Scientist",
      "Ai Researcher",
      "Ai Research Engineer (kernel & Inference Optimization)",
      "Ai Research Engineer (model Compression & Quantization)",
      "Ai Research Engineer (multi-modal & Vision)",
      "Ai Research Engineer (multi-modal Reinforcement Learning)",
    ]) {
      expect(canonicalizeRolesForProfile(raw), raw).toEqual([
        "AI Research Engineer",
      ]);
    }
    expect(canonicalizeRolesForProfile("Ai Inference Engineer")).toEqual([
      "AI Inference Engineer",
    ]);
    expect(
      canonicalizeRolesForProfile("Ai Inference Engineer (qvac)"),
    ).toEqual(["AI Inference Engineer"]);
    expect(canonicalizeRolesForProfile("Ai Inference Engineer Qvac")).toEqual([
      "AI Inference Engineer",
    ]);
  });

  it("收口 LLM engineer variants including inference typo", () => {
    for (const raw of [
      "senior ai llm engineer",
      "llm application engineer",
      "llm engineer",
      "llm inferrence optimization engineer",
    ]) {
      expect(canonicalizeRolesForProfile(raw), raw).toEqual(["LLM Engineer"]);
    }
  });

  it("收口 python-primary role titles", () => {
    for (const raw of [
      "python developer",
      "python developer software engineer",
      "python + Typescript engineer",
      "python + sql software engineer",
      "expierenced python software engineer",
    ]) {
      expect(canonicalizeRolesForProfile(raw), raw).toEqual([
        "Python Engineer",
      ]);
    }
  });

  it("收口 GTM, BDR, category theory, .NET, network, PM", () => {
    expect(canonicalizeRolesForProfile("Applied category theory research")).toEqual([
      "Applied Category Theory",
    ]);
    expect(
      canonicalizeRolesForProfile("Applied category theory researcher"),
    ).toEqual(["Applied Category Theory"]);
    expect(canonicalizeRolesForProfile("go to market")).toEqual([
      "Go-to-Market",
    ]);
    expect(canonicalizeRolesForProfile("go-to-market leader")).toEqual([
      "Go-to-Market",
    ]);
    expect(canonicalizeRolesForProfile("Bdr")).toEqual(["BDR"]);
    expect(canonicalizeRolesForProfile("Bdr engineer")).toEqual(["BDR"]);
    expect(canonicalizeRolesForProfile(".net Engineer")).toEqual([
      ".NET Engineer",
    ]);
    expect(canonicalizeRolesForProfile("C# .net Developer")).toEqual([
      ".NET Engineer",
    ]);
    expect(canonicalizeRolesForProfile(".net And Azure Architect")).toEqual([
      ".NET Architect",
    ]);
    expect(canonicalizeRolesForProfile("Network Engineer")).toEqual([
      "Network Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Networking Engineers")).toEqual([
      "Network Engineer",
    ]);
    for (const raw of [
      "It Project Manager",
      "Ai Project Manager",
      "Project Manager Delivery Manager",
      "Technical Project Manager",
      "Technical Project Manager (tether Wallet)",
      "Senior Ai Project Manager",
    ]) {
      expect(canonicalizeRolesForProfile(raw), raw).toEqual([
        "Project Manager",
      ]);
    }
  });
});
