import { describe, expect, it } from "vitest";
import { aggregateRequiredSkillsByCanonical } from "@/lib/jobRequiredSkills";
import { filterCanonicalSkillSuggestions } from "@/lib/skillChipSuggest";

describe("jobRequiredSkills", () => {
  it("收口 required_skills tech aliases and keeps soft-skill labels", () => {
    const out = aggregateRequiredSkillsByCanonical([
      { name: "nodejs", count: 4 },
      { name: "Node.js", count: 2 },
      { name: "Communication", count: 10 },
      { name: "Typescript Strict", count: 3 },
    ]);
    expect(out.find((o) => o.name === "Node.js")?.count).toBe(6);
    expect(out.find((o) => o.name === "TypeScript")?.count).toBe(3);
    expect(out.find((o) => o.name === "Communication")?.count).toBe(10);
  });

  it("matches alias queries like nodejs to Node.js chips", () => {
    const stats = [
      { name: "Node.js", count: 6 },
      { name: "React", count: 10 },
      { name: "Communication", count: 3 },
    ];
    expect(filterCanonicalSkillSuggestions(stats, "nodejs")).toEqual([
      "Node.js",
    ]);
  });
});
