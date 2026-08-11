import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import {
  aggregateRequiredSkillsByCanonical,
  jobRequiredSkillsQueries,
} from "@/lib/jobRequiredSkills";
import {
  JOB_STACK_VOCAB_VERSION,
  type CanonicalStackOption,
  type RawStackStatRow,
} from "@/lib/jobTechStack";

/**
 * Cached canonical required_skills chips for Profile "My skills".
 * Shares JOB_STACK_VOCAB_VERSION because chip 收口 uses the same skill map.
 */
export const getCanonicalRequiredSkillStats = unstable_cache(
  async (): Promise<CanonicalStackOption[]> => {
    const res = await db.execute(jobRequiredSkillsQueries().stats);
    const rows: RawStackStatRow[] = res.rows.map((r) => ({
      name: String(r.name ?? ""),
      count: Number(r.count ?? 0),
    }));
    return aggregateRequiredSkillsByCanonical(rows);
  },
  ["job-required-skills-canonical", String(JOB_STACK_VOCAB_VERSION)],
  { revalidate: 43200, tags: ["stacks-tag"] },
);
