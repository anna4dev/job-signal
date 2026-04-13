"use client";
import { decode } from "html-entities";
import ReportIssueSheet from "./ReportIssueSheet";
import { JobRawPostSectionProps } from "@/types/job";

export default function JobRawPostSection({
  jobData,
  baseTechStack,
}: JobRawPostSectionProps) {
  const formatRawText = (raw: string) => {
    const decoded = decode(raw || "");
    return decoded
      .replace(/\r\n/g, "\n")
      // line break tags
      .replace(/<br\b[^>]*\/?>/gi, "\n")
      // common block-level opening tags -> start a new paragraph
      .replace(/<(p|div|li|ul|ol|section|article|h[1-6])\b[^>]*>/gi, "\n\n")
      // list item closing tags still deserve spacing
      .replace(/<\/li>/gi, "\n")
      // block-level closing tags
      .replace(/<\/(p|div|ul|ol|section|article|h[1-6])>/gi, "\n\n")
      // strip remaining tags
      .replace(/<[^>]+>/g, "")
      // normalize repeated whitespace/newlines
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
          // 现在这里可以安全使用函数了，因为父组件也是 Client Component
          trigger={(open) => (
            <button
              onClick={open}
              className="px-3 py-1.5 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg text-xs font-bold text-amber-800"
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
