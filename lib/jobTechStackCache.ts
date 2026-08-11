import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import {
  aggregateStackCountsByCanonical,
  buildStackAliasIndex,
  JOB_STACK_VOCAB_VERSION,
  type CanonicalStackOption,
  type RawStackStatRow,
  type StackAliasIndex,
} from "@/lib/jobTechStack";

const DISTINCT_RAW_STACK_SQL = `
  SELECT DISTINCT j.value AS val
  FROM jobs_structured, json_each(jobs_structured.tech_stack) AS j
  WHERE jobs_structured.tech_stack IS NOT NULL
    AND typeof(j.value) = 'text'
    AND j.value != ''
`;

const RAW_STACK_STATS_SQL = `
  SELECT j.value AS name, COUNT(*) AS count
  FROM jobs_structured, json_each(jobs_structured.tech_stack) AS j
  WHERE jobs_structured.tech_stack IS NOT NULL
    AND typeof(j.value) = 'text'
    AND j.value != ''
  GROUP BY j.value
  ORDER BY count DESC
`;

/** Cached alias index for stack filter SQL (canonical chip → raw json_each values). */
export const getJobStackAliasIndex = unstable_cache(
  async (): Promise<StackAliasIndex> => {
    const res = await db.execute(DISTINCT_RAW_STACK_SQL);
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
    const res = await db.execute(RAW_STACK_STATS_SQL);
    const rows: RawStackStatRow[] = res.rows.map((r) => ({
      name: String(r.name ?? ""),
      count: Number(r.count ?? 0),
    }));
    return aggregateStackCountsByCanonical(rows);
  },
  ["job-stacks-stats-canonical", String(JOB_STACK_VOCAB_VERSION)],
  { revalidate: 43200, tags: ["stacks-tag"] },
);
