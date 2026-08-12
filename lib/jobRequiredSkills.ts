/**
 * Job required_skills vocabulary — source: jobs_structured.required_skills.
 *
 * Profile "My skills" (capabilities) suggestions. Same chip 收口 as tech stack
 * via canonicalizeSkillsForProfile (tech aliases + title-case soft skills).
 */

import {
  aggregateStackCountsByCanonical,
  type CanonicalStackOption,
  type RawStackStatRow,
} from "@/lib/jobTechStack";

const RAW_REQUIRED_SKILL_STATS_SQL = `
  SELECT j.value AS name, COUNT(*) AS count
  FROM jobs_structured, json_each(jobs_structured.required_skills) AS j
  WHERE jobs_structured.required_skills IS NOT NULL
    AND typeof(j.value) = 'text'
    AND j.value != ''
  GROUP BY j.value
  ORDER BY count DESC
`;

export function jobRequiredSkillsQueries() {
  return { stats: RAW_REQUIRED_SKILL_STATS_SQL };
}

/** Aggregate raw required_skills COUNT(*) into canonical profile skill chips. */
export function aggregateRequiredSkillsByCanonical(
  rows: RawStackStatRow[],
): CanonicalStackOption[] {
  return aggregateStackCountsByCanonical(rows);
}

export {
  filterCanonicalSkillNames,
  filterCanonicalSkillSuggestions,
} from "@/lib/skillChipSuggest";
