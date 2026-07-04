import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600; // cache

const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://jobsignal.dev";
  const result = await db.execute(
    "SELECT job_id, COALESCE(updated_at, post_at) AS last_modified FROM jobs_structured ORDER BY post_at DESC LIMIT 500",
  );

  const jobEntries: MetadataRoute.Sitemap = result.rows.map((row) => ({
    url: `${baseUrl}/jobs/${row.job_id}`,
    lastModified: toDate(row.last_modified),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Newest job drives the homepage freshness signal.
  const newestJobDate = jobEntries[0]?.lastModified ?? new Date();

  // Indexable routes only. /bookmarks and /profile are local-first (noindex).
  return [
    {
      url: baseUrl,
      lastModified: newestJobDate,
      changeFrequency: "daily",
      priority: 1,
    },
    ...jobEntries,
  ];
}
