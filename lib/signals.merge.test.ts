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
      ]),
      {},
      emptyRejections,
    );
    expect(merged.skills).toHaveLength(1);
    expect(merged.skills[0].value).toBe("Node.js");
    // weights accumulate then normalize to 1 for a single skill
    expect(merged.skills[0].weight).toBe(1);
  });
});
