import { db } from "@/lib/db";
import FilterBar from "@/components/FilterBar";
import JobsList from "@/components/JobsList";
import { JobWithCompany } from "@/types/job";
import BookmarkEntry from "@/components/BookmarkEntry";
import ProfileEntry from "@/components/ProfileEntry";
import Footer from "@/components/Footer";
import { unstable_cache } from "next/cache";
import {
  FIT_CANDIDATE_LIMIT,
  parseJobSortMode,
  type JobSortMode,
} from "@/lib/jobSort";

type QueryParam = string | number | null;
export const revalidate = 300;

export const metadata = {
  title: "Hacker News Who's Hiring | Structured & Filterable Job Board",
  description:
    "Browse the latest Hacker News Who's Hiring thread with powerful filters. Search by tech stack, industry, and company size in a clean, structured interface.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Hacker News",
    "Who's Hiring",
    "Software Engineer Jobs",
    "Tech Jobs Search",
    "Remote Jobs",
    "Job Signal",
  ],
  openGraph: {
    title: "Hacker News Who's Hiring - Structured Interface",
    description:
      "Stop scrolling long threads. Find your next tech job with our structured HN job board.",
    type: "website",
  },
};

type JobSearchFilters = {
  searchQuery: string;
  selectedStacks: string[];
  isRemote: boolean;
  hasVisa: boolean;
  days: number | null;
  level: string | null;
  minSalary: number;
  isUSA: boolean;
  isIntl: boolean;
  sort: JobSortMode;
};

const normalizeStacks = (stacks: string[]) =>
  Array.from(new Set(stacks.map((s) => s.trim()).filter(Boolean))).sort();

function orderClause(sort: JobSortMode): string {
  if (sort === "pay") {
    // SQLite: push nulls last, then highest salary_max.
    return "ORDER BY (j.salary_max IS NULL), j.salary_max DESC, j.post_at DESC";
  }
  // newest + fit candidate pool (fit re-sorts on the client)
  return "ORDER BY j.post_at DESC";
}

const getJobsPage = unstable_cache(
  async (
    _cacheKey: string,
    filters: JobSearchFilters,
    currentPage: number,
    pageSize: number,
  ): Promise<{ total: number; jobs: JobWithCompany[] }> => {
    const selectedStacks = normalizeStacks(filters.selectedStacks);
    const params: QueryParam[] = [];
    const whereParts: string[] = [];

    const hasTextQuery = filters.searchQuery.length > 0;
    if (hasTextQuery) {
      whereParts.push("(j.role_title LIKE ? OR c.company_name LIKE ?)");
      params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
    } else {
      whereParts.push("1 = 1");
    }

    if (selectedStacks.length > 0) {
      const stackPlaceholders = selectedStacks.map(() => "?").join(",");
      whereParts.push(`(
        SELECT COUNT(DISTINCT value)
        FROM json_each(j.tech_stack)
        WHERE value IN (${stackPlaceholders})
      ) = ?`);
      params.push(...selectedStacks, selectedStacks.length);
    }

    if (filters.isRemote) {
      whereParts.push("j.location_remote = ?");
      params.push(1);
    }

    if (filters.hasVisa) {
      whereParts.push("j.location_visa_supported = ?");
      params.push(1);
    }

    if (filters.days) {
      whereParts.push("j.post_at >= date('now', ?)");
      params.push(`-${filters.days} days`);
    }

    if (filters.level) {
      whereParts.push("j.level = ?");
      params.push(filters.level);
    }

    if (filters.minSalary > 0) {
      whereParts.push("j.salary_max >= ?");
      params.push(filters.minSalary);
    }

    if (filters.isUSA && !filters.isIntl) {
      whereParts.push("j.location_country = ?");
      params.push("USA");
    } else if (filters.isIntl && !filters.isUSA) {
      whereParts.push(
        "j.location_country != ? AND j.location_country IS NOT NULL",
      );
      params.push("USA");
    }

    const whereClause = `WHERE ${whereParts.join(" AND ")}`;

    const countFrom = hasTextQuery
      ? `FROM jobs_structured j JOIN company_structured c ON j.company_id = c.company_id`
      : `FROM jobs_structured j`;
    const countSql = `SELECT COUNT(*) as total ${countFrom} ${whereClause}`;

    const isFitPool = filters.sort === "fit";
    const limit = isFitPool ? FIT_CANDIDATE_LIMIT : pageSize;
    const offset = isFitPool ? 0 : (currentPage - 1) * pageSize;

    const listSql = `
      SELECT
        j.*,
        c.company_name,
        c.industry,
        c.size,
        c.funding_stage
      FROM jobs_structured j
      JOIN company_structured c ON j.company_id = c.company_id
      ${whereClause}
      ${orderClause(filters.sort)}
      LIMIT ? OFFSET ?
    `;

    const [countRes, jobsRes] = await db.batch(
      [
        { sql: countSql, args: params },
        { sql: listSql, args: [...params, limit, offset] },
      ],
      "read",
    );

    const total = Number(countRes.rows[0]?.total || 0);
    const jobs = (jobsRes.rows as unknown as JobWithCompany[]).map((job) => ({
      ...job,
      post_at: new Date(job.post_at).toISOString().slice(0, 10),
    }));

    return { total, jobs };
  },
  ["jobs-page-v3"],
  { revalidate: 60, tags: ["jobs-page-tag-v3"] },
);

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;
  const pageSize = 10;
  const sort = parseJobSortMode(sParams.sort);

  const searchQuery = (sParams.q || "").trim();
  const isRemote = sParams.remote === "true";
  const hasVisa = sParams.visa === "true";

  const days = Number(sParams.days) || null;
  const level = sParams.level || null;
  const minSalary = Number(sParams.min_salary) || 0;

  const isUSA = sParams.usa === "true";
  const isIntl = sParams.intl === "true";
  const selectedStacks = sParams.stack
    ? normalizeStacks(sParams.stack.split(","))
    : [];

  const filtersKey = JSON.stringify({
    searchQuery,
    selectedStacks,
    isRemote,
    hasVisa,
    days,
    level,
    minSalary,
    isUSA,
    isIntl,
    sort,
  });

  const { total, jobs } = await getJobsPage(
    filtersKey,
    {
      searchQuery,
      selectedStacks,
      isRemote,
      hasVisa,
      days,
      level,
      minSalary,
      isUSA,
      isIntl,
      sort,
    },
    currentPage,
    pageSize,
  );
  const totalPages = Math.ceil(total / pageSize);

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
        <aside className="lg:col-span-1">
          <FilterBar />
        </aside>

        <main className="lg:col-span-3">
          <JobsList
            jobs={jobs}
            sort={sort}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </main>
        <ProfileEntry />
        <BookmarkEntry />
      </div>
      <Footer />
    </div>
  );
}
