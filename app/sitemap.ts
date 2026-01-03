import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await db.execute("SELECT job_id FROM jobs_structured");

  const jobEntries = result.rows.map((row) => ({
    url: `https://job-signal.vercel.app/jobs/${row.job_id}`,
    lastModified: new Date(),
  }));

  return [
    { url: "https://job-signal.vercel.app/", lastModified: new Date() },
    ...jobEntries,
  ];
}
