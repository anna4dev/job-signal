/**
 * Job tech stack vocabulary — single source: jobs_structured.tech_stack.
 *
 * Used by homepage StackFilter (/api/jobs/stack) and Profile Tech want/don't.
 * Raw DB tokens → canonical chips via profileVocabulary; filter SQL expands
 * chips back to raw aliases. Not for capabilities / required_skills.
 */

import {
  canonicalizeSkillsForProfile,
  profileTagKey,
} from "@/lib/profileVocabulary";

/** Bump when stack canonicalization rules change (invalidates Next data cache). */
export const JOB_STACK_VOCAB_VERSION = 3;

export type RawStackStatRow = { name: string; count: number };
export type CanonicalStackOption = { name: string; count: number };

export type StackAliasEntry = { label: string; rawValues: string[] };
/** profileTagKey → canonical label + all raw job tech_stack tokens that map to it. */
export type StackAliasIndex = Record<string, StackAliasEntry>;

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

export function jobTechStackQueries() {
  return {
    distinctRaw: DISTINCT_RAW_STACK_SQL,
    stats: RAW_STACK_STATS_SQL,
  };
}

/** Build canonicalKey → { label, rawValues } from distinct raw stack tokens. */
export function buildStackAliasIndex(
  rawValues: Iterable<string>,
): StackAliasIndex {
  const index: StackAliasIndex = {};
  for (const raw of rawValues) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    for (const label of canonicalizeSkillsForProfile(trimmed)) {
      const key = profileTagKey(label);
      if (!index[key]) {
        index[key] = { label, rawValues: [] };
      }
      const entry = index[key];
      if (!entry.rawValues.includes(trimmed)) {
        entry.rawValues.push(trimmed);
      }
    }
  }
  for (const entry of Object.values(index)) {
    entry.rawValues.sort((a, b) => a.localeCompare(b));
  }
  return index;
}

/** Aggregate raw COUNT(*) rows into canonical display options (counts summed). */
export function aggregateStackCountsByCanonical(
  rows: RawStackStatRow[],
): CanonicalStackOption[] {
  const byKey = new Map<string, CanonicalStackOption>();
  for (const row of rows) {
    const raw = row.name.trim();
    if (!raw) continue;
    const n = Number(row.count) || 0;
    for (const label of canonicalizeSkillsForProfile(raw)) {
      const key = profileTagKey(label);
      const prev = byKey.get(key);
      if (prev) prev.count += n;
      else byKey.set(key, { name: label, count: n });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Canonical suggestion labels from raw search rows (deduped, capped). */
export function canonicalStackSuggestionsFromRaw(
  rawValues: string[],
  limit = 10,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawValues) {
    const v = raw.trim();
    if (!v) continue;
    for (const label of canonicalizeSkillsForProfile(v)) {
      const key = profileTagKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Raw DB tokens to match for one canonical chip (legacy raw URLs fall back to exact). */
export function rawStackValuesForCanonical(
  canonical: string,
  index: StackAliasIndex,
): string[] {
  const key = profileTagKey(canonical);
  const entry = index[key];
  if (entry && entry.rawValues.length > 0) return entry.rawValues;
  const trimmed = canonical.trim();
  return trimmed ? [trimmed] : [];
}

/**
 * AND semantics: job must hit at least one raw alias per selected canonical chip.
 * Returns SQL fragments + bind args for use in a jobs_structured WHERE clause.
 */
export function stackFilterExistsClauses(
  canonicalSelections: string[],
  index: StackAliasIndex,
): { sqlParts: string[]; args: string[] } {
  const sqlParts: string[] = [];
  const args: string[] = [];
  for (const sel of canonicalSelections) {
    const raws = rawStackValuesForCanonical(sel, index);
    if (raws.length === 0) continue;
    const placeholders = raws.map(() => "?").join(", ");
    sqlParts.push(
      `EXISTS (SELECT 1 FROM json_each(j.tech_stack) je WHERE je.value IN (${placeholders}))`,
    );
    args.push(...raws);
  }
  return { sqlParts, args };
}
