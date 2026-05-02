import { db } from "@/lib/db";
import { NextRequest } from "next/server";

type SuggestionType = "skills" | "industries" | "roles" | "locations";

const ALLOWED_TYPES: ReadonlySet<SuggestionType> = new Set([
  "skills",
  "industries",
  "roles",
  "locations",
]);
const MAX_QUERY_LENGTH = 64;

function isSuggestionType(v: unknown): v is SuggestionType {
  return typeof v === "string" && ALLOWED_TYPES.has(v as SuggestionType);
}

// Escape SQL LIKE special chars (`\`, `%`, `_`) so user input is matched
// literally. The escape character must match the `ESCAPE '\\'` clause on every
// LIKE. The backslash itself must be escaped first to avoid double-escaping
// the wildcard escapes that come after.
function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Simple in-process cache. Bounded at MAX_CACHE_ENTRIES — without an upper bound,
// high-cardinality requests (each new query string seeds a new entry) can grow
// memory indefinitely since entries only evict on cache hits past TTL.
// FIFO eviction via Map insertion order is sufficient for this read-mostly cache.
const cache = new Map<string, { data: string[]; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 500;

function getCached(key: string): string[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: string[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { data, at: Date.now() });
}

// Trim + case-insensitive dedupe for scalar suggestion rows.
// SQL DISTINCT only de-dupes by exact value, so trimming after the query can
// re-introduce duplicates ("FinTech" / "fintech" / " Fintech " all collapse to
// the same key here). First-seen casing is preserved.
function normalizeRows(
  rows: ArrayLike<Record<string, unknown>>,
  limit: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i].val;
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const rawType = req.nextUrl.searchParams.get("type");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (
    !isSuggestionType(rawType) ||
    !q ||
    q.length < 1 ||
    q.length > MAX_QUERY_LENGTH
  ) {
    return Response.json([]);
  }
  const type: SuggestionType = rawType;

  const cacheKey = `${type}:${q.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return Response.json(cached);

  // Escape SQL LIKE wildcards before composing the pattern. `q` is parameterized
  // so SQL injection is impossible, but raw `%` / `_` are still treated as
  // wildcards: a query of `%` would otherwise turn this endpoint into a top-N
  // scan and surface non-literal matches. Pair with `ESCAPE '\\'` on each LIKE.
  const pattern = `%${escapeLikePattern(q)}%`;

  try {
    let results: string[] = [];

    if (type === "skills") {
      // Primary: company tech_stack JSON arrays (cleaner data).
      // Secondary: jobs required_skills JSON arrays.
      const [techRes, skillsRes] = await Promise.all([
        db.execute({
          sql: `SELECT DISTINCT je.value as val
                FROM company_structured c, json_each(c.tech_stack) je
                WHERE typeof(je.value) = 'text'
                  AND LOWER(je.value) LIKE LOWER(?) ESCAPE '\\'
                  AND je.value != ''
                ORDER BY je.value
                LIMIT 15`,
          args: [pattern],
        }),
        db.execute({
          sql: `SELECT DISTINCT je.value as val
                FROM jobs_structured j, json_each(j.required_skills) je
                WHERE typeof(je.value) = 'text'
                  AND LOWER(je.value) LIKE LOWER(?) ESCAPE '\\'
                  AND je.value != ''
                ORDER BY je.value
                LIMIT 15`,
          args: [pattern],
        }),
      ]);
      const seen = new Set<string>();
      for (const row of [...techRes.rows, ...skillsRes.rows]) {
        const v = typeof row.val === "string" ? row.val.trim() : null;
        if (v && !seen.has(v.toLowerCase())) {
          seen.add(v.toLowerCase());
          results.push(v);
        }
      }
      results = results.slice(0, 10);
    } else if (type === "industries") {
      const res = await db.execute({
        sql: `SELECT DISTINCT industry as val
              FROM company_structured
              WHERE LOWER(industry) LIKE LOWER(?) ESCAPE '\\'
                AND industry IS NOT NULL AND industry != ''
              ORDER BY industry
              LIMIT 20`,
        args: [pattern],
      });
      results = normalizeRows(res.rows, 10);
    } else if (type === "roles") {
      const res = await db.execute({
        sql: `SELECT DISTINCT role_title as val
              FROM jobs_structured
              WHERE LOWER(role_title) LIKE LOWER(?) ESCAPE '\\'
                AND role_title IS NOT NULL AND role_title != ''
              ORDER BY role_title
              LIMIT 20`,
        args: [pattern],
      });
      results = normalizeRows(res.rows, 10);
    } else if (type === "locations") {
      // Countries from the job board — already real/normalised values from postings.
      const res = await db.execute({
        sql: `SELECT DISTINCT location_country as val
              FROM jobs_structured
              WHERE LOWER(location_country) LIKE LOWER(?) ESCAPE '\\'
                AND location_country IS NOT NULL AND location_country != ''
              ORDER BY location_country
              LIMIT 20`,
        args: [pattern],
      });
      results = normalizeRows(res.rows, 10);
    }

    setCached(cacheKey, results);
    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
