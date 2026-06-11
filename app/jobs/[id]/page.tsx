import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { JobFullDetail, RiskFlag, RecentNews, RawPostData } from "@/types/job";
import JobDetailNav from "@/components/JobDetailNav";
import BookmarkEntry from "@/components/BookmarkEntry";
import ProfileEntry from "@/components/ProfileEntry";
import BookmarkStatusSection from "@/components/BookmarkStatusSection";
import Footer from "@/components/Footer";
import JobSalaryCard from "@/components/JobOverrides/JobSalaryCard";
import JobVisaSupportCard from "@/components/JobOverrides/JobVisaSupportCard";
import JobTechStackTags from "@/components/JobOverrides/JobTechStackTags";
import JobRawPostSection from "@/components/JobOverrides/JobRawPostSection";
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  // get detail
  const result = await db.execute({
    sql: "SELECT j.role_title, c.company_name FROM jobs_structured j JOIN company_structured c ON c.company_id = j.company_id WHERE job_id =  ?",
    args: [id],
  });
  const job = result.rows[0];
  if (!job) {
    return { title: "Job Not Found", robots: { index: false, follow: false } };
  }
  return {
    title: `${job.role_title} at ${job.company_name} | HN Who's Hiring`,
    description: `Check out this ${job.role_title} position at ${job.company_name} from the latest Hacker News Who's Hiring thread.`,
    alternates: {
      canonical: `/jobs/${id}`,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Data Fetching
  const { id } = await params;
  const result = await db.execute({
    sql: `
    SELECT j.*, c.*,
      r.raw_text
    FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    JOIN jobs_raw r ON r.id = j.job_raw_id
    WHERE j.job_id = ?
  `,
    args: [id],
  });
  const job = result.rows[0] as unknown as JobFullDetail | undefined;
  if (!job) {
    console.log(`Job with ID ${id} not found`);
    notFound();
  }

  const rawPostData: RawPostData = {
    job_id: String(job.job_id),
    job_raw_id: String(job.job_raw_id),
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    location_visa_supported: job.location_visa_supported ?? null,
    raw_text: job.raw_text,
  };

  // 2. Helper function to parse JSON fields
  const parseJSON = <T,>(json: string | null, fallback: T): T => {
    try {
      if (!json || json === "null") {
        // fix string null
        return fallback;
      }
      const result = JSON.parse(json);
      return result ?? fallback;
    } catch {
      return fallback;
    }
  };

  const responsibilities = parseJSON<string[]>(job.responsibilities, []);
  const requiredSkills = parseJSON<string[]>(job.required_skills, []);
  const riskFlags = parseJSON<RiskFlag[]>(job.risk_flags, []);
  const engineeringSignals = parseJSON<string[]>(job.engineering_signals, []);
  const recentNews = parseJSON<RecentNews[]>(job.recent_news, []);
  const baseTechStack = parseJSON<string[]>(job.tech_stack, []);
  const sourceLinks = parseJSON<{ website?: string; linkedin?: string }>(
    job.source_links,
    {},
  );

  const displayLocation = () => {
    // 1. Prioritize Remote status
    if (
      job.location_city?.includes(",") ||
      job.location_city?.includes("/") ||
      job.location_city === job.location_country
    ) {
      return job.location_city;
    }

    // 2. Handle physical locations: combine city and country
    const parts = [job.location_city, job.location_country].filter(Boolean);

    // 3. Display parts if available, otherwise fallback
    return parts.length > 0 ? parts.join(", ") : "Location N/A";
  };

  // 2. prepare JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.role_title,
    description: job.level,
    datePosted: new Date(job.post_at as string).toISOString(),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      sameAs: sourceLinks.website, // company website
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: displayLocation(),
      },
    },
    baseSalary: job.salary_min
      ? {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: {
            "@type": "QuantitativeValue",
            minValue: job.salary_min,
            maxValue: job.salary_max,
            unitText: "YEAR",
          },
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Navigation */}
      <JobDetailNav
        jobId={job.job_id}
        website={sourceLinks.website}
        jdUrl={job.jd_url || undefined}
      />

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* Left Column: Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Core Info */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {job.role_title}
                </h1>
                <div className="flex items-center justify-between">
                  <p className="text-lg text-slate-600">
                    {job.company_name} · {job.industry}
                  </p>
                  <div className="text-right flex gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                      {job.level}
                    </span>

                    {job.location_remote === 1 && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                        {`Remote${job.location_timezone ? ` (${job.location_timezone})` : ""}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-slate-100">
                <JobSalaryCard
                  jobId={job.job_id}
                  baseSalaryMin={job.salary_min}
                  baseSalaryMax={job.salary_max}
                  baseVisaSupported={job.location_visa_supported}
                  baseTechStack={baseTechStack}
                />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Location</p>
                  <p className="font-semibold text-slate-900">
                    {displayLocation()}
                  </p>
                </div>
                <JobVisaSupportCard
                  jobId={job.job_id}
                  baseVisaSupported={job.location_visa_supported}
                  baseSalaryMin={job.salary_min}
                  baseSalaryMax={job.salary_max}
                  baseTechStack={baseTechStack}
                />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Funding Stage</p>
                  <p className="font-semibold text-slate-900">
                    {job.funding_stage || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight">
                  Job Responsibilities
                </h3>
                <ul className="space-y-3">
                  {responsibilities.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-slate-600 text-sm leading-relaxed"
                    >
                      <span className="text-blue-500 font-bold">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Skills */}
              {requiredSkills.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight">
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Engineering & Technology */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Engineering Culture & Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2 mb-8">
                <JobTechStackTags
                  jobId={job.job_id}
                  baseTechStack={baseTechStack}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {engineeringSignals.map((signal, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {signal}
                  </div>
                ))}
              </div>
            </section>

            {/* Raw Post (HN reference) */}
            <JobRawPostSection
              jobData={rawPostData}
              baseTechStack={baseTechStack}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Application Status — shown only when job is bookmarked */}
            <BookmarkStatusSection jobId={job.job_id} />

            {/* Risk Assessment */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Risk Insights
              </h3>
              <div className="space-y-3">
                {riskFlags.length > 0 ? (
                  riskFlags.map((risk, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        risk.severity === "high"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}
                    >
                      <strong>{risk.flag}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No major risk signals detected.
                  </p>
                )}
              </div>
            </section>

            {/* Company News */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Recent News
              </h3>
              <div className="space-y-4">
                {recentNews.map((news, i) => (
                  <a
                    key={i}
                    href={news.url}
                    target="_blank"
                    className="block group"
                  >
                    <p className="text-xs text-slate-500 mb-1">{news.date}</p>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-snug">
                      {news.title}
                    </p>
                  </a>
                ))}
                {recentNews.length === 0 && (
                  <p className="text-xs text-slate-400 italic">
                    No recent updates
                  </p>
                )}
              </div>
            </section>

            {/* Metadata */}
            <div className="p-4 bg-slate-100 rounded-xl">
              <p className="text-[10px] text-slate-400 leading-normal uppercase font-bold mb-2 tracking-widest">
                Data Source
              </p>
              <p className="text-[11px] text-slate-500">
                Content parsed by LLM from Hacker News raw data. Confidence:
                <span
                  className={`ml-1 font-bold ${
                    job.confidence === "high"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {job.confidence.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
        </div>

        <ProfileEntry />
        <BookmarkEntry />
        <Footer />
      </main>

      {/* 3. 将脚本注入页面 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
