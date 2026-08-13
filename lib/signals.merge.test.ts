import { describe, expect, it } from "vitest";
import { mergePreferences } from "@/lib/signals";
import type { Preferences, Rejections } from "@/types/profile";

const emptyRejections: Rejections = { hard: {}, soft: {} };

function prefs(skills: Preferences["skills"]): Preferences {
  return {
    roles: [],
    skills,
    industries: [],
    companySizes: [],
    fundingStages: [],
  };
}

describe("mergePreferences skills", () => {
  it("keeps first-seen explicit display value when aliases collide", () => {
    const merged = mergePreferences(
      prefs([
        { value: "Node.js", weight: 0.4, source: "explicit" },
        { value: "nodejs", weight: 0.3, source: "explicit" },
        { value: "Python", weight: 0.3, source: "explicit" },
      ]),
      {},
      emptyRejections,
    );
    expect(merged.skills).toHaveLength(2);
    const node = merged.skills.find((s) => s.value === "Node.js");
    const python = merged.skills.find((s) => s.value === "Python");
    expect(node).toBeDefined();
    expect(python).toBeDefined();
    // 0.4 + 0.3 = 0.7 vs Python 0.3 → 0.7 : 0.3 after normalize
    expect(node!.weight).toBeCloseTo(0.7, 5);
    expect(python!.weight).toBeCloseTo(0.3, 5);
  });
});
