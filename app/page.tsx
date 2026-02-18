import { db } from "@/lib/db";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import { JobWithCompany } from "@/types/job";
import Pagination from "@/components/Pagination";
import BookmarkEntry from "@/components/BookmarkEntry";

type QueryParam = string | number | null;
export const revalidate = 300;

export const metadata = {
  title: "Hacker News Who's Hiring | Structured & Filterable Job Board",
  description:
    "Browse the latest Hacker News Who's Hiring thread with powerful filters. Search by tech stack, industry, and company size in a clean, structured interface.",
  keywords: [
    "Hacker News",
    "Who's Hiring",
    "Software Engineer Jobs",
    "Tech Jobs Search",
    "Remote Jobs",
    "job signal",
  ],
  openGraph: {
    title: "Hacker News Who's Hiring - Structured Interface",
    description:
      "Stop scrolling long threads. Find your next tech job with our structured HN job board.",
    type: "website",
    // images: ['/og-image.png'], // preview logo
  },
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  // 1. Handle filtering logic (Server-side)
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;
  const pageSize = 10;
  const offset = (currentPage - 1) * pageSize;

  const searchQuery = sParams.q || "";
  const isRemote = sParams.remote === "true";
  const hasVisa = sParams.visa === "true";

  const days = Number(sParams.days) || null;
  const level = sParams.level || null;
  const minSalary = Number(sParams.min_salary) || 0;

  const isUSA = sParams.usa === "true";
  const isIntl = sParams.intl === "true";
  const stage = sParams.stage || ""; // 'early' | 'growth' | 'mature'

  // 2. Build base filter conditions
  let whereClause = `WHERE (j.role_title LIKE ? OR c.company_name LIKE ?)`;
  const params: QueryParam[] = [`%${searchQuery}%`, `%${searchQuery}%`];

  if (isRemote) {
    whereClause += ` AND j.location_remote = ?`;
    params.push(1);
  }
  if (hasVisa) {
    whereClause += ` AND j.location_visa_supported = ?`;
    params.push(1);
  }
  // Filter by time (SQLite using date function)
  if (days) {
    whereClause += ` AND j.post_at >= date('now', ?)`;
    params.push(`-${days} days`);
  }

  // Filter by job level
  if (level) {
    whereClause += ` AND j.level = ?`;
    params.push(level);
  }

  // Filter by salary
  if (minSalary > 0) {
    // If the max salary of the job doesn't meet the user's minimum requirement, filter it out
    whereClause += ` AND j.salary_max >= ?`;
    params.push(minSalary);
  }

  // 3. 新增：地区筛选 (基于 location_country)
  if (isUSA && !isIntl) {
    whereClause += ` AND j.location_country = ?`;
    params.push("USA");
  } else if (isIntl && !isUSA) {
    whereClause += ` AND j.location_country != ? AND j.location_country IS NOT NULL`;
    params.push("USA");
  }

  // 4. 新增：公司阶段筛选 (基于 funding_stage)
  if (stage === "early") {
    whereClause += ` AND (
    c.funding_stage LIKE '%Seed%' OR 
    c.funding_stage LIKE '%Series A%' OR 
    c.funding_stage LIKE '%YC %' OR 
    c.funding_stage LIKE '%Early%' OR 
    c.funding_stage LIKE '%Bootstrapped%' OR
    c.funding_stage LIKE '%Pre-series A%' OR
    c.funding_stage LIKE '%$10M%'
  )`;
  } else if (stage === "growth") {
    whereClause += ` AND (
    c.funding_stage LIKE '%Series B%' OR 
    c.funding_stage LIKE '%Series C%' OR 
    c.funding_stage LIKE '%Series D%' OR 
    c.funding_stage LIKE '%Growth%' OR 
    c.funding_stage LIKE '%Unicorn%' OR 
    c.funding_stage LIKE '%Well-funded%' OR
    c.funding_stage LIKE '%$50M%'
  )`;
  } else if (stage === "mature") {
    whereClause += ` AND (
    c.funding_stage LIKE '%Profitable%' OR 
    c.funding_stage LIKE '%Acquired%' OR 
    c.funding_stage LIKE '%Pre-IPO%' OR 
    c.funding_stage LIKE '%Established%' OR
    c.funding_stage LIKE '%Private%' OR
    c.funding_stage LIKE '%cashflow positive%'
  )`;
  }

  // 3. Get total count for pagination calculation
  const [countRes, jobsRes] = await db.batch(
    [
      {
        sql: `SELECT COUNT(*) as total FROM jobs_structured j JOIN company_structured c ON j.company_id = c.company_id ${whereClause}`,
        args: params,
      },
      {
        sql: `SELECT j.*, c.company_name, c.tech_stack FROM jobs_structured j JOIN company_structured c ON j.company_id = c.company_id ${whereClause} ORDER BY j.post_at DESC LIMIT ? OFFSET ?`,
        args: [...params, pageSize, offset],
      },
    ],
    "read",
  );

  const total = Number(countRes.rows[0].total);
  const totalPages = Math.ceil(total / pageSize);
  // const jobs = jobsRes.rows as unknown as JobWithCompany[];
  const jobs = (jobsRes.rows as unknown as JobWithCompany[]).map((job) => ({
    ...job,
    post_at: new Date(job.post_at).toISOString().slice(0, 10),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Hacker News Jobs Explorer
        </h1>
        <p className="text-gray-500 mt-2">
          Structured presentation of HN &quot;Who&apos;s Hiring&quot; listings
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Filters */}
        <aside className="lg:col-span-1">
          <FilterBar />
        </aside>

        {/* Job List */}
        <main className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <span>Found {total} matching jobs</span>
          </div>

          {jobs.map((job: JobWithCompany) => (
            <JobCard key={job.job_id} job={job} />
          ))}

          {/* 5. Pagination Controller */}
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}

          {jobs.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-400">
                No matching jobs found. Try adjusting your filters.
              </p>
            </div>
          )}
        </main>
        <BookmarkEntry />
      </div>
      <footer className="mt-20 py-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Job Signal</p>
          <p>
            Built with ❤️ by{" "}
            <a
              href="https://www.anna4code.dev/"
              target="_blank"
              className="font-medium text-blue-600 hover:underline transition-colors"
            >
              Anna4code
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
