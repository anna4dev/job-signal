import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import {
  aggregateStackCountsByCanonical,
  buildStackAliasIndex,
  jobTechStackQueries,
  JOB_STACK_VOCAB_VERSION,
  type CanonicalStackOption,
  type RawStackStatRow,
  type StackAliasIndex,
} from "@/lib/jobTechStack";

/** Cached alias index for stack filter SQL (canonical chip → raw json_each values). */
export const getJobStackAliasIndex = unstable_cache(
  async (): Promise<StackAliasIndex> => {
    const res = await db.execute(jobTechStackQueries().distinctRaw);
    const raws = res.rows
      .map((r) => (typeof r.val === "string" ? r.val : ""))
      .filter(Boolean);
    return buildStackAliasIndex(raws);
  },
  ["job-tech-stack-alias", String(JOB_STACK_VOCAB_VERSION)],
  { revalidate: 43200, tags: ["stacks-tag"] },
);

/** Cached canonical stack options + job counts for filter UI. */
export const getCanonicalJobStackStats = unstable_cache(
  async (): Promise<CanonicalStackOption[]> => {
    const res = await db.execute(jobTechStackQueries().stats);
    const rows: RawStackStatRow[] = res.rows.map((r) => ({
      name: String(r.name ?? ""),
      count: Number(r.count ?? 0),
    }));
    return aggregateStackCountsByCanonical(rows);
  },
  ["job-stacks-stats-canonical", String(JOB_STACK_VOCAB_VERSION)],
  { revalidate: 43200, tags: ["stacks-tag"] },
);
