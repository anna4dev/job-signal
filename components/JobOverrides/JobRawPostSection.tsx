"use client";

import { decode } from "html-entities";
import ReportIssueSheet from "./ReportIssueSheet";
import { useMarkedNotAJob } from "@/hooks/useMarkedNotAJob";
import { JobRawPostSectionProps } from "@/types/job";

export default function JobRawPostSection({
  jobData,
  baseTechStack,
}: JobRawPostSectionProps) {
  const markedNotAJob = useMarkedNotAJob(jobData.job_id);

  const formatRawText = (raw: string) => {
    const decoded = decode(raw || "");
    return decoded
      .replace(/\r\n/g, "\n")
      .replace(/<br\b[^>]*\/?>/gi, "\n")
      .replace(/<(p|div|li|ul|ol|section|article|h[1-6])\b[^>]*>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/(p|div|ul|ol|section|article|h[1-6])>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const processedText = formatRawText(jobData.raw_text);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">Raw Post</h3>

        <ReportIssueSheet
          jobId={jobData.job_id}
          jobRawId={jobData.job_raw_id}
          baseSalaryMin={jobData.salary_min}
          baseSalaryMax={jobData.salary_max}
          baseVisaSupported={jobData.location_visa_supported}
          baseTechStack={baseTechStack}
          disabled={markedNotAJob}
          trigger={(open, disabled) => (
            <button
              type="button"
              onClick={open}
              disabled={disabled}
              aria-disabled={disabled}
              className={
                disabled
                  ? "px-3 py-1.5 bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 cursor-not-allowed"
                  : "px-3 py-1.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 rounded-lg text-xs font-bold text-white cursor-pointer"
              }
            >
              ⚠ Report Issue
            </button>
          )}
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-blue-600 select-none">
          Show original text
        </summary>
        <div className="mt-3 max-h-100 whitespace-pre-wrap overflow-auto font-mono text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
          {processedText}
        </div>
      </details>
    </section>
  );
}
