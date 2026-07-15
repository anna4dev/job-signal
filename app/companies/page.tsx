import Link from "next/link";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import BookmarkEntry from "@/components/BookmarkEntry";
import ProfileEntry from "@/components/ProfileEntry";
import { listIndexableCompanies } from "@/lib/companies";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Companies Hiring on Hacker News | Job Signal",
  description:
    "Browse companies with recurring HN Who's Hiring presence — roles, remote/visa coverage, and recent postings.",
  alternates: { canonical: "/companies" },
};

const PAGE_SIZE = 20;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sParams = await searchParams;
  const currentPage = Number(firstParam(sParams.page)) || 1;
  const q = firstParam(sParams.q).trim();

  const { total, companies } = await listIndexableCompanies({
    page: currentPage,
    pageSize: PAGE_SIZE,
    q,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Companies
            </h1>
            <p className="text-slate-500 mt-2">
              Employers with recurring HN Who&apos;s Hiring activity
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            ← Jobs
          </Link>
        </div>
      </header>

      <form className="mb-6" action="/companies" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search companies or industry"
          className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </form>

      <p className="text-sm text-slate-500 mb-4">
        {total === 0
          ? "No matching companies"
          : `${total} compan${total === 1 ? "y" : "ies"}`}
      </p>

      <ul className="space-y-3">
        {companies.map((c) => (
          <li key={c.company_id}>
            <Link
              href={`/companies/${encodeURIComponent(c.company_id)}`}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {c.company_name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {[c.industry, c.size, c.funding_stage]
                      .filter(Boolean)
                      .join(" · ") || "Company profile"}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500 shrink-0">
                  <div className="font-semibold text-slate-800">
                    {c.job_count} roles
                  </div>
                  {c.last_post_at ? (
                    <div className="text-xs mt-0.5">Last {c.last_post_at}</div>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {companies.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-slate-200 border-dashed">
          <p className="text-slate-400">No companies match this filter.</p>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <Suspense fallback={null}>
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </Suspense>
      ) : null}

      <ProfileEntry />
      <BookmarkEntry />
      <Footer />
    </div>
  );
}
