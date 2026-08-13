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

  it("收口 .NET / ASP.NET / C# stack variants to .NET", () => {
    for (const raw of [
      ".NET",
      ".NET 10",
      ".NET 8",
      ".NET Core",
      ".NET Framework",
      "Asp.net",
      "Asp.net Core",
      "Asp.net Mvc",
      "ASP.NET",
      "C# .NET",
      "C#",
      "csharp",
    ]) {
      expect(canonicalizeSkillsForProfile(raw), raw).toEqual([".NET"]);
    }
  });

  it("收口 TypeScript strict qualifier", () => {
    expect(canonicalizeSkillsForProfile("Typescript Strict")).toEqual([
      "TypeScript",
    ]);
    expect(canonicalizeSkillsForProfile("Ts")).toEqual(["TypeScript"]);
  });

  it("收口 Docker / Django / Argo / Azure / React Router / Route 53 families", () => {
    expect(canonicalizeSkillsForProfile("Docker Compose")).toEqual(["Docker"]);
    expect(canonicalizeSkillsForProfile("Docker Swarm")).toEqual(["Docker"]);
    expect(canonicalizeSkillsForProfile("Python Interop")).toEqual(["Python"]);
    expect(canonicalizeSkillsForProfile("Node Or Python")).toEqual([
      "Node.js",
      "Python",
    ]);
    expect(canonicalizeSkillsForProfile("Django 4.1.13")).toEqual(["Django"]);
    expect(canonicalizeSkillsForProfile("Django Q")).toEqual(["Django Q"]);
    expect(canonicalizeSkillsForProfile("Django Rest Framework")).toEqual([
      "Django REST Framework",
    ]);
    expect(canonicalizeSkillsForProfile("Argocd")).toEqual(["Argo CD"]);
    expect(canonicalizeSkillsForProfile("Argo Cd")).toEqual(["Argo CD"]);
    expect(canonicalizeSkillsForProfile("Argo")).toEqual(["Argo CD"]);
    expect(canonicalizeSkillsForProfile("Agora Rtc")).toEqual(["Agora RTC"]);
    expect(canonicalizeSkillsForProfile("Azure Ai Foundry")).toEqual([
      "Azure AI",
    ]);
    expect(canonicalizeSkillsForProfile("Azure Openai")).toEqual([
      "Azure OpenAI",
    ]);
    expect(canonicalizeSkillsForProfile("Azure Container Apps")).toEqual([
      "Azure Container Apps",
    ]);
    expect(canonicalizeSkillsForProfile("React Router v7")).toEqual([
      "React Router",
    ]);
    expect(canonicalizeSkillsForProfile("Route53")).toEqual(["Route 53"]);
  });

  it("收口 Rest / REST API variants (not Django REST Framework)", () => {
    for (const raw of [
      "Rest",
      "Rest Api",
      "Rest Apis",
      "Restful Apis",
      "REST",
      "REST API",
    ]) {
      expect(canonicalizeSkillsForProfile(raw), raw).toEqual(["REST API"]);
    }
    expect(canonicalizeSkillsForProfile("Django Rest Framework")).toEqual([
      "Django REST Framework",
    ]);
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

  it("收口 Javascript before Java; Internet is not .NET", () => {
    expect(canonicalizeRolesForProfile("Javascript Developer")).toEqual([
      "JavaScript Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Internet Engineer")).not.toEqual([
      ".NET Engineer",
    ]);
  });

  it("does not map Database / Design Systems titles via data/design substrings", () => {
    expect(canonicalizeRolesForProfile("Database Engineer")).not.toEqual([
      "Data Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Design Systems Manager")).not.toEqual([
      "Designer",
    ]);
  });

  it("maps iOS to mobile without matching BIOS", () => {
    expect(canonicalizeRolesForProfile("iOS Engineer")).toEqual([
      "Mobile Engineer",
    ]);
    expect(canonicalizeRolesForProfile("BIOS Engineer")).not.toEqual([
      "Mobile Engineer",
    ]);
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

  it("uses structural rules for seniority, specialty tails, and plurals", () => {
    expect(canonicalizeRolesForProfile("Junior Quantitative Developer")).toEqual([
      "Quantitative Developer",
    ]);
    expect(
      canonicalizeRolesForProfile("Lead Quantitative Developer Engineer"),
    ).toEqual(["Quantitative Developer"]);
    expect(
      canonicalizeRolesForProfile(
        "Domain Expert - Valuation, Quantitative Default-probability, Or Interest Rate Prediction Models",
      ),
    ).toEqual(["Domain Expert"]);
    expect(
      canonicalizeRolesForProfile(
        "Member Of Technical Staff, Fault Tolerant Quantum Compilation + Simulations",
      ),
    ).toEqual(["Member of Technical Staff"]);
    expect(canonicalizeRolesForProfile("Cloud Infrastructure Engineers")).toEqual([
      "Cloud Infrastructure Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Cloud Infrastructure Engineer")).toEqual([
      "Cloud Infrastructure Engineer",
    ]);
    expect(
      canonicalizeRolesForProfile("Application Software Engineer, Endpoint Security"),
    ).toEqual(["Application Software Engineer"]);
    expect(
      canonicalizeRolesForProfile(
        "Autonomy Engineer, Fixed Wing Planning & Controls",
      ),
    ).toEqual(["Autonomy Engineer"]);
  });

  it("maps language-primary titles via rules, not per-company aliases", () => {
    expect(canonicalizeRolesForProfile("Rust Developer")).toEqual([
      "Rust Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Rust Developer - Polycentric")).toEqual([
      "Rust Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Rust Distributed Engineer")).toEqual([
      "Rust Engineer",
    ]);
  });

  it("收口 Account Executive variants structurally", () => {
    for (const raw of [
      "Account Executive",
      "Account Executive (defense And Aerospace)",
      "Account Exec",
      "Account Executive Sales",
      "Account Executive, Defense & Aerospace",
      "Account Executives",
      "Associate Account Executive",
    ]) {
      expect(canonicalizeRolesForProfile(raw), raw).toEqual([
        "Account Executive",
      ]);
    }
  });

  it("keeps BD/CS Executive distinct; collapses EA-to-CEO", () => {
    expect(
      canonicalizeRolesForProfile("Business Development Executive"),
    ).toEqual(["Business Development Executive"]);
    expect(
      canonicalizeRolesForProfile("Customer Support Executive"),
    ).toEqual(["Customer Support Executive"]);
    expect(canonicalizeRolesForProfile("Executive Assistant")).toEqual([
      "Executive Assistant",
    ]);
    expect(
      canonicalizeRolesForProfile("Executive Assistant to Ceo"),
    ).toEqual(["Executive Assistant"]);
    expect(
      canonicalizeRolesForProfile("Executive Assistant to the Ceo"),
    ).toEqual(["Executive Assistant"]);
  });

  it("收口 agentic ops and Research: specialty titles", () => {
    expect(
      canonicalizeRolesForProfile("Agentic Operations Coordinator"),
    ).toEqual(["Agentic Operator"]);
    expect(canonicalizeRolesForProfile("Agentic Operator")).toEqual([
      "Agentic Operator",
    ]);
    expect(
      canonicalizeRolesForProfile("Research: Analytic Learning Algorithms"),
    ).toEqual(["AI Research Engineer"]);
  });

  it("收口 C++/runtime and Mid-senior Systems/runtime slash titles", () => {
    expect(canonicalizeRolesForProfile("C++/runtime Engineer")).toEqual([
      "C++ Engineer",
      "Runtime Engineer",
    ]);
    expect(
      canonicalizeRolesForProfile("Mid-senior Systems/runtime Engineer"),
    ).toEqual(["Systems Engineer", "Runtime Engineer"]);
  });

  it("收口 SWE / SW / EE / ME abbreviations", () => {
    expect(canonicalizeRolesForProfile("Swe")).toEqual(["Software Engineer"]);
    expect(canonicalizeRolesForProfile("Swe Ii")).toEqual([
      "Software Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Sw Engineer")).toEqual([
      "Software Engineer",
    ]);
    expect(canonicalizeRolesForProfile("C++ Systems Swe")).toEqual([
      "C++ Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Ee Engineer")).toEqual([
      "Electrical Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Me Engineer")).toEqual([
      "Mechanical Engineer",
    ]);
  });

  it("收口 Customer Service / Success titles", () => {
    expect(canonicalizeRolesForProfile("Customer Service Rep")).toEqual([
      "Customer Service Representative",
    ]);
    expect(
      canonicalizeRolesForProfile("Customer Service Representative"),
    ).toEqual(["Customer Service Representative"]);
    expect(canonicalizeRolesForProfile("Customer Success")).toEqual([
      "Customer Success",
    ]);
    expect(canonicalizeRolesForProfile("Customer Success Engineer")).toEqual([
      "Customer Success Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Customer Success Lead")).toEqual([
      "Customer Success Manager",
    ]);
    expect(canonicalizeRolesForProfile("Customer Success Manager")).toEqual([
      "Customer Success Manager",
    ]);
    expect(
      canonicalizeRolesForProfile(
        "Customer and Operations Success Associate",
      ),
    ).toEqual(["Customer Success Associate"]);
    expect(
      canonicalizeRolesForProfile("Founding Customer Success Manager"),
    ).toEqual(["Customer Success Manager"]);
    expect(
      canonicalizeRolesForProfile("Technical Customer Success Manager"),
    ).toEqual(["Customer Success Manager"]);
  });

  it("收口 slash/amp compounds, BD, robotics, automation", () => {
    expect(
      canonicalizeRolesForProfile("Legal Operations / Legal Tech Associate"),
    ).toEqual(["Legal Operations", "Legal Tech Associate"]);
    expect(
      canonicalizeRolesForProfile("Forecasting Model Developer / Statistician"),
    ).toEqual(["Forecasting Model Developer", "Statistician"]);
    expect(
      canonicalizeRolesForProfile("Cv & Robotics Software Engineer"),
    ).toEqual(["Computer Vision Engineer", "Robotics Engineer"]);

    expect(
      canonicalizeRolesForProfile("Business Development Representative Us"),
    ).toEqual(["BDR"]);
    expect(
      canonicalizeRolesForProfile("Business Development Representative"),
    ).toEqual(["BDR"]);
    expect(canonicalizeRolesForProfile("Business Developer")).toEqual(["BDR"]);
    expect(canonicalizeRolesForProfile("Business Development")).toEqual([
      "Business Development",
    ]);
    expect(canonicalizeRolesForProfile("Business Development Lead")).toEqual([
      "Business Development",
    ]);
    expect(
      canonicalizeRolesForProfile("Business Development Executive"),
    ).toEqual(["Business Development Executive"]);
    expect(canonicalizeRolesForProfile("Business Operations Leader")).toEqual([
      "Business Operations",
    ]);

    expect(canonicalizeRolesForProfile("Head of Robotics")).toEqual([
      "Robotics Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Robotics Engineer")).toEqual([
      "Robotics Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Robotics Lead")).toEqual([
      "Robotics Engineer",
    ]);
    expect(canonicalizeRolesForProfile("Robotics Architect")).toEqual([
      "Robotics Architect",
    ]);
    expect(
      canonicalizeRolesForProfile("Robotic Perception Engineer"),
    ).toEqual(["Robotics Engineer"]);

    expect(canonicalizeRolesForProfile("Automated Test Engineer")).toEqual([
      "Automation Tester",
    ]);
    expect(
      canonicalizeRolesForProfile("Automation Tester Lead/senior"),
    ).toEqual(["Automation Tester"]);
    expect(
      canonicalizeRolesForProfile("Automation Tester Mid Level"),
    ).toEqual(["Automation Tester"]);

    expect(canonicalizeRolesForProfile("Web Scraping Engineer")).toEqual([
      "Web Scraping Engineer",
    ]);
    expect(
      canonicalizeRolesForProfile("Web Scraping Junior Developer"),
    ).toEqual(["Web Scraping Engineer"]);
  });
});
