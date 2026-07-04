"use client";

import { JOB_OVERRIDES_EVENT } from "@/hooks/useJobEffectiveJob";
import { useMarkedNotAJob } from "@/hooks/useMarkedNotAJob";
import {
  getJobOverridesFromLocalStorage,
  setJobOverridesToLocalStorage,
} from "@/lib/jobOverrides";

/**
 * Instant local feedback after reporting "not a job".
 * Undo clears only this device's mark; the server-side correction is not revoked.
 */
export default function JobNotAJobBanner({ jobId }: { jobId: string }) {
  const marked = useMarkedNotAJob(jobId);

  const onUndo = () => {
    const overrides = getJobOverridesFromLocalStorage();
    const current = overrides[jobId];
    if (!current?.is_job) return;
    const next = { ...current };
    delete next.is_job;
    if (Object.keys(next).length === 0) {
      delete overrides[jobId];
    } else {
      overrides[jobId] = next;
    }
    setJobOverridesToLocalStorage(overrides);
    window.dispatchEvent(
      new CustomEvent(JOB_OVERRIDES_EVENT, { detail: { jobId } }),
    );
  };

  if (!marked) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-300 bg-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-bold text-slate-900">
          Marked as not a job posting
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          On this device only. Cards below are dimmed; you can undo anytime.
        </p>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
      >
        Undo
      </button>
    </div>
  );
}
