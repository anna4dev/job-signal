import { db } from "@/lib/db";
import { NextRequest } from "next/server";

type SuggestionType = "skills" | "industries" | "roles" | "locations";

// Simple in-process cache: avoids repeated DB hits for the same query within a request lifecycle.
// Key: "type:query", Value: string[]
const cache = new Map<string, { data: string[]; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  cache.set(key, { data, at: Date.now() });
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as SuggestionType | null;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!type || !q || q.length < 1) {
    return Response.json([]);
  }

  const cacheKey = `${type}:${q.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return Response.json(cached);

  const pattern = `%${q}%`;

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
                  AND LOWER(je.value) LIKE LOWER(?)
                  AND je.value != ''
                ORDER BY je.value
                LIMIT 15`,
          args: [pattern],
        }),
        db.execute({
          sql: `SELECT DISTINCT je.value as val
                FROM jobs_structured j, json_each(j.required_skills) je
                WHERE typeof(je.value) = 'text'
                  AND LOWER(je.value) LIKE LOWER(?)
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
              WHERE LOWER(industry) LIKE LOWER(?)
                AND industry IS NOT NULL AND industry != ''
              ORDER BY industry
              LIMIT 10`,
        args: [pattern],
      });
      results = res.rows
        .map((r) => (typeof r.val === "string" ? r.val.trim() : null))
        .filter((v): v is string => !!v);
    } else if (type === "roles") {
      const res = await db.execute({
        sql: `SELECT DISTINCT role_title as val
              FROM jobs_structured
              WHERE LOWER(role_title) LIKE LOWER(?)
                AND role_title IS NOT NULL AND role_title != ''
              ORDER BY role_title
              LIMIT 10`,
        args: [pattern],
      });
      results = res.rows
        .map((r) => (typeof r.val === "string" ? r.val.trim() : null))
        .filter((v): v is string => !!v);
    } else if (type === "locations") {
      // Countries from the job board — already real/normalised values from postings.
      const res = await db.execute({
        sql: `SELECT DISTINCT location_country as val
              FROM jobs_structured
              WHERE LOWER(location_country) LIKE LOWER(?)
                AND location_country IS NOT NULL AND location_country != ''
              ORDER BY location_country
              LIMIT 10`,
        args: [pattern],
      });
      results = res.rows
        .map((r) => (typeof r.val === "string" ? r.val.trim() : null))
        .filter((v): v is string => !!v);
    }

    setCached(cacheKey, results);
    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
