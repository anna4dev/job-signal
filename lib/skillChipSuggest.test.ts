import { describe, expect, it } from "vitest";
import { filterCanonicalSkillNames } from "@/lib/skillChipSuggest";

describe("skillChipSuggest", () => {
  it("matches alias queries like nodejs to Node.js chips", () => {
    const names = ["Node.js", "React", "Communication"];
    expect(filterCanonicalSkillNames(names, "nodejs")).toEqual(["Node.js"]);
    expect(filterCanonicalSkillNames(names, "Node")).toEqual(["Node.js"]);
    expect(filterCanonicalSkillNames(names, "comm")).toEqual([
      "Communication",
    ]);
  });
});
