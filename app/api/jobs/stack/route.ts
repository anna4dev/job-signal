import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

// 1. stack list with cache
const getCachedStackStats = unstable_cache(
  async () => {
    // query stack fron json
    const query = `
      SELECT 
          j.value AS name, 
          COUNT(*) AS count
      FROM 
          jobs_structured, 
          json_each(jobs_structured.tech_stack) AS j
      WHERE 
          jobs_structured.tech_stack IS NOT NULL
      GROUP BY 
          j.value
      ORDER BY 
          count DESC;
    `;

    const response = await db.execute(query);
    // serialization
    return Array.from(response.rows);
  },
  ["job-stacks-stats-v1"], // cache key
  {
    revalidate: 43200, // 12 hours
    tags: ["stacks-tag"],
  },
);

export async function GET() {
  try {
    const data = await getCachedStackStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Stack API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
