"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { formatSalaryRange } from "@/lib/formatSalary";
import { trackCompanyEvents } from "@/lib/companyEvents";
import type { CompanyJobSnapshot } from "@/types/company";

const BookmarkButton = dynamic(() => import("./BookmarkButton"), {
  ssr: false,
  loading: () => (
    <div className="w-8 h-8 bg-slate-100 animate-pulse rounded-lg" />
  ),
});

/**
 * Company jobs list with second-click / bookmark / apply instrumentation
 * for Phase B conversion metrics.
 */
export default function CompanyJobsZone({
  companyId,
  jobs,
  totalJobCount,
}: {
  companyId: string;
  jobs: CompanyJobSnapshot[];
  totalJobCount: number;
}) {
  /** Record a company → job second-click. */
  function handleJobClick(jobId: string, position: number) {
    trackCompanyEvents([
      {
        company_id: companyId,
        job_id: jobId,
        event_type: "job_click",
        position,
      },
    ]);
  }

  /** Record a bookmark toggle initiated from the company jobs list. */
  function handleBookmarkToggle(
    jobId: string,
    position: number,
    nowBookmarked: boolean,
  ) {
    trackCompanyEvents([
      {
        company_id: companyId,
        job_id: jobId,
        event_type: nowBookmarked ? "bookmark_add" : "bookmark_remove",
        position,
      },
    ]);
  }

  /** Record an outbound apply / original-post click from the company page. */
  function handleApplyClick(jobId: string, position: number) {
    trackCompanyEvents([
      {
        company_id: companyId,
        job_id: jobId,
        event_type: "apply_click",
        position,
      },
    ]);
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-8">
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Open & recent roles</h2>
        <span className="text-xs text-slate-400">
          Showing {jobs.length}
          {totalJobCount > jobs.length ? ` of ${totalJobCount}` : ""}
        </span>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-slate-400">No jobs linked yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {jobs.map((job, index) => {
            const salary = formatSalaryRange(job.salary_min, job.salary_max);
            const location = [job.location_city, job.location_country]
              .filter(Boolean)
              .join(", ");
            return (
              <li key={job.job_id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <Link
                        href={`/jobs/${job.job_id}`}
                        onClick={() => handleJobClick(job.job_id, index)}
                        className="font-semibold text-slate-900 hover:text-slate-600 transition-colors"
                      >
                        {job.role_title}
                      </Link>
                      <div className="shrink-0">
                        <BookmarkButton
                          jobId={job.job_id}
                          size="sm"
                          showText={false}
                          onAfterToggle={(_id, nowBookmarked) =>
                            handleBookmarkToggle(
                              job.job_id,
                              index,
                              nowBookmarked,
                            )
                          }
                        />
                      </div>
                    </div>
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
                    {job.jd_url ? (
                      <a
                        href={job.jd_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleApplyClick(job.job_id, index)}
                        className="inline-block mt-2 text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                      >
                        Apply / original post
                      </a>
                    ) : null}
                  </div>
                  <div className="text-right text-sm shrink-0">
                    {salary ? (
                      <p className="font-semibold text-slate-800">{salary}</p>
                    ) : null}
                    <p className="text-xs text-slate-400 mt-0.5">{job.post_at}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
