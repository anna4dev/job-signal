"use client";
import Link from "next/link";
import { JobWithCompany } from "@/types/job";
import BookmarkButton from "@/components/BookmarkButton";
import { formatSalaryRange } from "@/lib/formatSalary";
import { Fragment, useMemo } from "react";

interface JobCardProps {
  job: JobWithCompany;
  fitScore?: number;
  reasonTags?: string[];
  hardFail?: boolean;
  onOpenJob?: (jobId: string) => void;
  onBookmarkToggle?: (jobId: string, nowBookmarked: boolean) => void;
}

const MAX_TECH = 6;
const MAX_REASON_TAGS = 4;

export default function JobCard({
  job,
  fitScore,
  reasonTags,
  hardFail,
  onOpenJob,
  onBookmarkToggle,
}: JobCardProps) {
  const getTechStack = (jsonStr: string): string[] => {
    try {
      const parsed = JSON.parse(jsonStr || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === "string")
        : [];
    } catch {
      return [];
    }
  };

  const techStack = getTechStack(job.tech_stack);
  const visibleTech = techStack.slice(0, MAX_TECH);
  const extraTech = Math.max(0, techStack.length - MAX_TECH);

  const visibleReasonTags = (reasonTags ?? []).slice(0, MAX_REASON_TAGS);
  const extraReasonTags = Math.max(
    0,
    (reasonTags?.length ?? 0) - MAX_REASON_TAGS,
  );

  const showFit = typeof fitScore === "number";
  const salaryLabel = formatSalaryRange(job.salary_min, job.salary_max);

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

  const metaItems: string[] = [locationText ?? "Location N/A"];
  if (job.location_remote === 1) metaItems.push(remoteLabel);
  if (job.location_visa_supported === 1) metaItems.push("Visa");

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-6 transition-all hover:border-slate-300 hover:shadow-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100">
      {/* Fit micro-label row — text-only, disappears when no fit score */}
      {showFit ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-slate-400">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${
              hardFail ? "bg-slate-500" : "bg-slate-900"
            }`}
          >
            {hardFail ? "Constraint not met" : `Fit ${fitScore}`}
          </span>
          {visibleReasonTags.map((tag, i) => (
            <Fragment key={`${tag}-${i}`}>
              {i > 0 ? (
                <span className="text-slate-300" aria-hidden="true">
                  •
                </span>
              ) : null}
              <span>{tag}</span>
            </Fragment>
          ))}
          {extraReasonTags > 0 ? (
            <Fragment>
              {visibleReasonTags.length > 0 ? (
                <span className="text-slate-300" aria-hidden="true">
                  •
                </span>
              ) : null}
              <span>+{extraReasonTags} more</span>
            </Fragment>
          ) : null}
        </div>
      ) : null}

      {/* Title + save (left), salary (right, wraps on narrow screens) */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/jobs/${job.job_id}`}
            onClick={() => onOpenJob?.(job.job_id)}
            className="text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors hover:text-slate-600 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {job.role_title}
          </Link>
          <div className="shrink-0">
            <BookmarkButton
              jobId={job.job_id}
              size="sm"
              showText={false}
              onAfterToggle={onBookmarkToggle}
            />
          </div>
        </div>

        <div className="shrink-0">
          {salaryLabel ? (
            <span className="text-base font-semibold tabular-nums tracking-tight text-slate-800">
              {salaryLabel}
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-500">
              Salary Competitive
            </span>
          )}
        </div>
      </div>

      {/* Meta: company • location • remote • visa (flat, low-noise) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400/80">
        <Link
          href={`/companies/${encodeURIComponent(job.company_id)}`}
          className="font-medium text-slate-700 underline-offset-2 transition-colors hover:text-slate-900 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {job.company_name}
        </Link>
        {metaItems.map((item, i) => (
          <Fragment key={`${item}-${i}`}>
            <span className="text-slate-300" aria-hidden="true">
              •
            </span>
            <span>{item}</span>
          </Fragment>
        ))}
      </div>

      {/* Tech stack */}
      {visibleTech.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-x-1.5 gap-y-1.5">
          {visibleTech.map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100/60 rounded"
            >
              {tech}
            </span>
          ))}
          {extraTech > 0 ? (
            <span
              className="px-2 py-0.5 text-xs font-medium text-slate-400"
              title={techStack.slice(MAX_TECH).join(", ")}
            >
              +{extraTech}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Posted — lightweight base line */}
      <div className="mt-3 text-[11px] font-normal tracking-normal text-slate-400/80">
        Posted {job.post_at}
      </div>
    </div>
  );
}
