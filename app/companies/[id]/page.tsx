import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Footer from "@/components/Footer";
import BookmarkEntry from "@/components/BookmarkEntry";
import ProfileEntry from "@/components/ProfileEntry";
import DetailTopNav from "@/components/DetailTopNav";
import {
  getCompanyDetail,
  getCompanyJobs,
  getCompanyQuickStats,
} from "@/lib/companies";
import { formatSalaryRange } from "@/lib/formatSalary";

export const revalidate = 300;

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/** Malformed percent-encoding (e.g. a stray `%` from bot probes) must 404, not throw. */
function safeDecodeId(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function parseSourceLinks(raw: string | null): {
  website?: string;
  linkedin?: string;
} {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    return {
      website: typeof obj.website === "string" ? obj.website : undefined,
      linkedin: typeof obj.linkedin === "string" ? obj.linkedin : undefined,
    };
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = safeDecodeId(rawId);
  const company = id ? await getCompanyDetail(id) : null;
  if (!company || !id) {
    return { title: "Company Not Found", robots: { index: false, follow: false } };
  }
  const stats = await getCompanyQuickStats(id, company.company_name);
  const title = `${company.company_name} Hiring | HN Who's Hiring`;
  const description =
    company.company_description?.slice(0, 160) ||
    `${company.company_name} roles from Hacker News Who's Hiring — ${stats.jobCount} structured listings.`;

  return {
    title,
    description,
    alternates: { canonical: `/companies/${encodeURIComponent(id)}` },
    robots: stats.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = safeDecodeId(rawId);
  const company = id ? await getCompanyDetail(id) : null;
  if (!company || !id) notFound();

  const [stats, jobs] = await Promise.all([
    getCompanyQuickStats(id, company.company_name),
    getCompanyJobs(id, 50),
  ]);

  const techStack = parseJsonArray(company.tech_stack);
  const culture = parseJsonArray(company.culture_keywords);
  const links = parseSourceLinks(company.source_links);
  const lastUpdated =
    stats.lastPostAt || company.updated_at || company.created_at;
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toISOString().slice(0, 10)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <DetailTopNav
        fallbackHref="/companies"
        actions={
          links.website ? (
            <a
              href={links.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              Website
            </a>
          ) : undefined
        }
      />

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        {/* Hero */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Company
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company.company_name}
          </h1>
          <p className="mt-2 text-slate-600">
            {[company.industry, company.size, company.funding_stage]
              .filter(Boolean)
              .join(" · ") || "HN Who's Hiring employer"}
          </p>
          {company.company_description ? (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-3xl">
              {company.company_description}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {links.website ? (
              <a
                href={links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                Website
              </a>
            ) : null}
            {links.linkedin ? (
              <a
                href={links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                LinkedIn
              </a>
            ) : null}
            {!stats.indexable ? (
              <span className="text-xs text-slate-400 self-center">
                Limited history — not in search index
              </span>
            ) : null}
          </div>
        </section>

        {/* Quick Decision Zone */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Quick Decision
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Tracked roles</p>
              <p className="font-semibold text-slate-900 text-lg">
                {stats.jobCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Remote share</p>
              <p className="font-semibold text-slate-900 text-lg">
                {stats.remoteShare == null ? "—" : `${stats.remoteShare}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Visa mentioned</p>
              <p className="font-semibold text-slate-900 text-lg">
                {stats.visaShare == null ? "—" : `${stats.visaShare}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Salary coverage</p>
              <p className="font-semibold text-slate-900 text-lg">
                {stats.salaryCoverage == null
                  ? "—"
                  : `${stats.salaryCoverage}%`}
              </p>
            </div>
          </div>

          {stats.topLevels.length > 0 ? (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
                Role level mix
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.topLevels.map((item) => (
                  <span
                    key={item.level}
                    className="px-3 py-1 bg-slate-50 text-slate-700 border border-slate-100 rounded-full text-xs font-semibold"
                  >
                    {item.level} · {item.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {techStack.length > 0 ? (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
                Company stack signals
              </p>
              <div className="flex flex-wrap gap-2">
                {techStack.slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {culture.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {culture.slice(0, 8).map((k) => (
                <span
                  key={k}
                  className="px-2 py-0.5 text-xs text-slate-500 border border-slate-100 rounded-md"
                >
                  {k}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* Company Jobs Zone */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-baseline justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Open & recent roles</h2>
            <span className="text-xs text-slate-400">
              Showing {jobs.length}
              {stats.jobCount > jobs.length ? ` of ${stats.jobCount}` : ""}
            </span>
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400">No jobs linked yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const salary = formatSalaryRange(job.salary_min, job.salary_max);
                const location = [job.location_city, job.location_country]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <li key={job.job_id} className="py-4 first:pt-0 last:pb-0">
                    <Link
                      href={`/jobs/${job.job_id}`}
                      className="group flex flex-wrap items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {job.role_title}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {[
                            job.level,
                            location || null,
                            job.location_remote === 1 ? "Remote" : null,
                            job.location_visa_supported === 1 ? "Visa" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="text-right text-sm shrink-0">
                        {salary ? (
                          <p className="font-semibold text-slate-800">{salary}</p>
                        ) : null}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {job.post_at}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Page Footer Baseline */}
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-xs text-slate-500 space-y-2">
          <p>
            <span className="font-semibold text-slate-700">Last updated:</span>{" "}
            {lastUpdatedLabel || "Unknown"}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Coverage:</span>{" "}
            {stats.jobCount} structured HN listings
            {stats.postingMonths.length > 0
              ? ` across ${stats.postingMonths.length} months`
              : ""}
            . Enrichment: {company.enrichment_status || "basic"}.
          </p>
          <p>
            <span className="font-semibold text-slate-700">Source:</span>{" "}
            {company.source || "Hacker News Who's Hiring"}
            {company.confidence ? ` · confidence ${company.confidence}` : ""}.
            Signals are derived from public posts; verify details on the original
            thread and company career page.
          </p>
          <p>
            Feedback: use Report Issue on a job page if structured fields look
            wrong.
          </p>
        </section>
      </main>

      <div className="max-w-6xl mx-auto px-4">
        <ProfileEntry />
        <BookmarkEntry />
        <Footer />
      </div>
    </div>
  );
}
