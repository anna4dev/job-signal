import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600; // cache

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://jobsignal.dev";
  const result = await db.execute(
    "SELECT job_id FROM jobs_structured ORDER BY post_at DESC LIMIT 500",
  );

  const jobEntries = result.rows.map((row) => ({
    url: `${baseUrl}/jobs/${row.job_id}`,
    lastModified: new Date(),
  }));

  return [
    { url: baseUrl, lastModified: new Date() },
    {
      url: `${baseUrl}/bookmarks`,
      lastModified: new Date(),
    },
    ...jobEntries,
  ];
}
