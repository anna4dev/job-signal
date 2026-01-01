import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JobFullDetail, RiskFlag, RecentNews } from "@/types/job";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Data Fetching
  const { id } = await params;
  console.log("Current request ID:", id);
  const job = db
    .prepare(
      `
    SELECT j.*, c.* FROM jobs_structured j
    JOIN company_structured c ON j.company_id = c.company_id
    WHERE j.job_id = ?
  `
    )
    .get(id) as JobFullDetail | undefined;

  if (!job) {
    console.log(`Job with ID ${id} not found`);
    notFound();
  }

  // 2. Helper function to parse JSON fields
  const parseJSON = <T,>(json: string | null, fallback: T): T => {
    try {
      return json ? JSON.parse(json) : fallback;
    } catch {
      return fallback;
    }
  };

  const responsibilities = parseJSON<string[]>(job.responsibilities, []);
  const requiredSkills = parseJSON<string[]>(job.required_skills, []);
  const riskFlags = parseJSON<RiskFlag[]>(job.risk_flags, []);
  const engineeringSignals = parseJSON<string[]>(job.engineering_signals, []);
  const recentNews = parseJSON<RecentNews[]>(job.recent_news, []);
  const sourceLinks = parseJSON<{ website?: string; linkedin?: string }>(
    job.source_links,
    {}
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

  return (
    <div className='min-h-screen bg-slate-50 pb-20'>
      {/* Top Navigation */}
      <nav className='bg-white border-b border-slate-200 sticky top-0 z-10'>
        <div className='max-w-5xl mx-auto px-4 h-16 flex items-center justify-between'>
          <Link
            href='/jobs'
            className='text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Back to List
          </Link>
          <div className='flex gap-3'>
            {sourceLinks.website && (
              <a
                href={sourceLinks.website}
                target='_blank'
                className='text-sm px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors'
              >
                Website
              </a>
            )}
            {!!job.jd_url && (
              <a
                href={job.jd_url || "#"}
                target='_blank'
                className='text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                Apply Now
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className='max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left Column: Main Content */}
        <div className='lg:col-span-2 space-y-8'>
          {/* Core Info */}
          <section className='bg-white rounded-2xl border border-slate-200 p-8'>
            <div className='flex justify-between items-start mb-6'>
              <div>
                <h1 className='text-3xl font-bold text-slate-900 mb-2'>
                  {job.role_title}
                </h1>
                <p className='text-lg text-slate-600'>
                  {job.company_name} · {job.industry}
                </p>
              </div>
              <div className='text-right flex gap-2'>
                <span className='text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider'>
                  {job.level}
                </span>

                <span className='text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider'>
                  {`${
                    job.location_remote === 1
                      ? "Remote" + (job.location_timezone || "")
                      : ""
                  }`}
                </span>
              </div>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-slate-100'>
              <div>
                <p className='text-xs text-slate-400 mb-1'>
                  Salary Range (USD)
                </p>
                <p className='font-semibold text-slate-900'>
                  {job.salary_min
                    ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(
                        job.salary_max! / 1000
                      )}k`
                    : "Negotiable"}
                </p>
              </div>
              <div>
                <p className='text-xs text-slate-400 mb-1'>Location</p>
                <p className='font-semibold text-slate-900'>
                  {displayLocation()}
                </p>
              </div>
              <div>
                <p className='text-xs text-slate-400 mb-1'>Visa Support</p>
                <p className='font-semibold text-slate-900'>
                  {job.location_visa_supported ? "Supported" : "Not Supported"}
                </p>
              </div>
              <div>
                <p className='text-xs text-slate-400 mb-1'>Funding Stage</p>
                <p className='font-semibold text-slate-900'>
                  {job.funding_stage || "Unknown"}
                </p>
              </div>
            </div>

            <div className='mt-8'>
              <h3 className='text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight'>
                Job Responsibilities
              </h3>
              <ul className='space-y-3'>
                {responsibilities.map((item, i) => (
                  <li
                    key={i}
                    className='flex gap-3 text-slate-600 text-sm leading-relaxed'
                  >
                    <span className='text-blue-500 font-bold'>•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Required Skills */}
            {requiredSkills.length > 0 && (
              <div className='mt-8 pt-6 border-t border-slate-100'>
                <h3 className='text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight'>
                  Required Skills
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {requiredSkills.map((skill, i) => (
                    <span
                      key={i}
                      className='px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold'
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Engineering & Technology */}
          <section className='bg-white rounded-2xl border border-slate-200 p-8'>
            <h2 className='text-xl font-bold text-slate-900 mb-6'>
              Engineering Culture & Tech Stack
            </h2>
            <div className='flex flex-wrap gap-2 mb-8'>
              {parseJSON<string[]>(job.tech_stack, []).map((tech) => (
                <span
                  key={tech}
                  className='px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium'
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {engineeringSignals.map((signal, i) => (
                <div
                  key={i}
                  className='flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-sm'
                >
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                  {signal}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className='space-y-6'>
          {/* Risk Assessment */}
          <section className='bg-white rounded-2xl border border-slate-200 p-6 shadow-sm'>
            <h3 className='text-sm font-bold text-slate-900 mb-4 flex items-center gap-2'>
              <svg
                className='w-4 h-4 text-amber-500'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              AI Risk Insights
            </h3>
            <div className='space-y-3'>
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
                <p className='text-xs text-slate-400 italic'>
                  No major risk signals detected.
                </p>
              )}
            </div>
          </section>

          {/* Company News */}
          <section className='bg-white rounded-2xl border border-slate-200 p-6'>
            <h3 className='text-sm font-bold text-slate-900 mb-4'>
              Recent News
            </h3>
            <div className='space-y-4'>
              {recentNews.map((news, i) => (
                <a
                  key={i}
                  href={news.url}
                  target='_blank'
                  className='block group'
                >
                  <p className='text-xs text-slate-500 mb-1'>{news.date}</p>
                  <p className='text-sm font-medium text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-snug'>
                    {news.title}
                  </p>
                </a>
              ))}
              {recentNews.length === 0 && (
                <p className='text-xs text-slate-400 italic'>
                  No recent updates
                </p>
              )}
            </div>
          </section>

          {/* Metadata */}
          <div className='p-4 bg-slate-100 rounded-xl'>
            <p className='text-[10px] text-slate-400 leading-normal uppercase font-bold mb-2 tracking-widest'>
              Data Source
            </p>
            <p className='text-[11px] text-slate-500'>
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
      </main>
    </div>
  );
}
