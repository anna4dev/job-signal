import { describe, expect, it } from "vitest";
import {
  aggregateStackCountsByCanonical,
  buildStackAliasIndex,
  canonicalStackSuggestionsFromRaw,
  rawStackValuesForCanonical,
  stackFilterExistsClauses,
} from "@/lib/jobTechStack";

describe("jobTechStack", () => {
  it("aggregates raw stack counts by canonical label", () => {
    const out = aggregateStackCountsByCanonical([
      { name: "nodejs", count: 5 },
      { name: "Node.js", count: 3 },
      { name: "React", count: 10 },
      { name: ".NET 8", count: 3 },
      { name: "Asp.net Core", count: 5 },
      { name: "C# .NET", count: 2 },
    ]);
    const node = out.find((o) => o.name === "Node.js");
    expect(node?.count).toBe(8);
    expect(out.find((o) => o.name === "React")?.count).toBe(10);
    expect(out.find((o) => o.name === ".NET")?.count).toBe(10);
  });

  it("merges Django and Route stack variants for filter dropdown", () => {
    const out = aggregateStackCountsByCanonical([
      { name: "Django", count: 83 },
      { name: "Django 4.1", count: 2 },
      { name: "Django 4.1.13", count: 2 },
      { name: "Django Q", count: 1 },
      { name: "Django Rest Framework", count: 1 },
      { name: "React Router", count: 1 },
      { name: "React Router v7", count: 1 },
      { name: "Route 53", count: 1 },
      { name: "Route53", count: 1 },
    ]);
    expect(out.find((o) => o.name === "Django")?.count).toBe(87);
    expect(out.find((o) => o.name === "React Router")?.count).toBe(2);
    expect(out.find((o) => o.name === "Route 53")?.count).toBe(2);
    const djangoRows = out.filter((o) => o.name.startsWith("Django"));
    expect(djangoRows).toHaveLength(3);
    expect(djangoRows.find((o) => o.name === "Django")?.count).toBe(87);
    expect(djangoRows.find((o) => o.name === "Django Q")?.count).toBe(1);
    expect(djangoRows.find((o) => o.name === "Django REST Framework")?.count).toBe(1);
  });

  it("builds alias index for filter expansion", () => {
    const index = buildStackAliasIndex(["nodejs", "Node.js", "react"]);
    const nodeRaws = rawStackValuesForCanonical("Node.js", index);
    expect(nodeRaws).toContain("nodejs");
    expect(nodeRaws).toContain("Node.js");
    expect(rawStackValuesForCanonical("React", index)).toEqual(["react"]);
  });

  it("dedupes canonical suggestions from raw search rows", () => {
    expect(
      canonicalStackSuggestionsFromRaw([
        "nodejs",
        "Node.js",
        "React/Next.js (TypeScript)",
      ]),
    ).toEqual(["Node.js", "React", "Next.js", "TypeScript"]);
  });

  it("emits per-chip EXISTS clauses for AND stack filter", () => {
    const index = buildStackAliasIndex(["nodejs", "Node.js", "react"]);
    const { sqlParts, args } = stackFilterExistsClauses(
      ["Node.js", "React"],
      index,
    );
    expect(sqlParts).toHaveLength(2);
    expect(sqlParts[0]).toContain("EXISTS");
    expect(args).toEqual(expect.arrayContaining(["nodejs", "Node.js", "react"]));
  });
});
