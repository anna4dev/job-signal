import { db } from "@/lib/db";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import { JobWithCompany } from "@/types/job";
import Pagination from "@/components/Pagination";

type QueryParam = string | number | null;

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

  // 3. Get total count for pagination calculation
  const countResult = db
    .prepare(
      `
    SELECT COUNT(*) as total 
    FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    ${whereClause}
  `
    )
    .get(...params) as { total: number };

  const total = countResult.total;
  const totalPages = Math.ceil(countResult.total / pageSize);

  // 4. Fetch paginated data
  const jobs = db
    .prepare(
      `
    SELECT j.*, c.company_name, c.tech_stack, c.industry, c.size
    FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    ${whereClause}
    ORDER BY j.post_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(...params, pageSize, offset) as JobWithCompany[];

  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
      <header className='mb-10'>
        <h1 className='text-3xl font-bold tracking-tight'>
          Hacker News Jobs Explorer
        </h1>
        <p className='text-gray-500 mt-2'>
          Structured presentation of HN &quot;Who&apos;s Hiring&quot; listings
        </p>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
        {/* Left Sidebar: Filters */}
        <aside className='lg:col-span-1'>
          <FilterBar />
        </aside>

        {/* Job List */}
        <main className='lg:col-span-3 space-y-4'>
          <div className='flex justify-between items-center text-sm text-gray-500 mb-4'>
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
            <div className='text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed'>
              <p className='text-gray-400'>
                No matching jobs found. Try adjusting your filters.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
