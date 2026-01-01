import Link from "next/link";
import { JobWithCompany } from "@/types/job";
import { useMemo } from "react";

interface JobCardProps {
  job: JobWithCompany;
}

export default function JobCard({ job }: JobCardProps) {
  // 安全地解析 JSON 字符串
  const getTechStack = (jsonStr: string): string[] => {
    try {
      return JSON.parse(jsonStr || "[]");
    } catch {
      return [];
    }
  };

  const techStack = getTechStack(job.tech_stack);

  const remoteLabel = job.location_timezone
    ? `Remote (${job.location_timezone})`
    : "Remote";
  const locationText = useMemo(() => {
    if (
      job.location_city?.includes(",") ||
      job.location_city?.includes("/") ||
      job.location_city === job.location_country
    ) {
      return job.location_city;
    }
    const parts = [job.location_city, job.location_country].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }

    return "Location N/A";
  }, [job]);

  return (
    <div className='bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all group'>
      <div className='flex justify-between items-start gap-4'>
        <div className='flex-1'>
          <div className='flex items-center gap-2 mb-1'>
            <Link
              href={`/jobs/${job.job_id}`}
              className='text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors'
            >
              {job.role_title}
            </Link>
            {/* {job.confidence === 'high' && (
              <span title="AI 解析置信度高" className="text-blue-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )} */}
          </div>

          <div className='flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500'>
            <span className='font-medium text-slate-700'>
              {job.company_name}
            </span>

            <div className='flex items-center gap-1'>
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
                  d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                />
              </svg>
              {locationText}
            </div>

            {job.location_remote === 1 && (
              <span className='flex items-center gap-1 text-emerald-600 font-medium'>
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
                    d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                {remoteLabel}
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-col items-end shrink-0'>
          {job.salary_min ? (
            <div className='text-base font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100'>
              ${Math.round(job.salary_min / 1000)}k - $
              {Math.round(job.salary_max! / 1000)}k
            </div>
          ) : (
            <span className='text-slate-400 text-xs'>Salary Competitive</span>
          )}
          {job.location_visa_supported === 1 && (
            <span className='mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100'>
              Visa Sponsorship
            </span>
          )}
        </div>
      </div>

      <div className='mt-4 flex flex-wrap gap-1.5'>
        {techStack.slice(0, 6).map((tech) => (
          <span
            key={tech}
            className='px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md border border-transparent group-hover:border-slate-200 transition-colors'
          >
            {tech}
          </span>
        ))}
      </div>

      <div className='mt-5 pt-4 border-t border-slate-50 flex items-center justify-between'>
        <span className='text-xs text-slate-400'>
          Posted on {new Date(job.post_at || "").toLocaleDateString()}{" "}
          {/* 假设 id 含日期前缀 */}
        </span>
        <Link
          href={`/jobs/${job.job_id}`}
          className='text-sm font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1'
        >
          View Insight
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
              d='M9 5l7 7-7 7'
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
