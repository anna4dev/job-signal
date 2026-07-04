"use client";

import type { ReactNode } from "react";
import { useMarkedNotAJob } from "@/hooks/useMarkedNotAJob";
import JobNotAJobBanner from "./JobNotAJobBanner";

/**
 * Banner stays interactive; page body is dimmed and non-interactive when
 * this device has marked the listing as not a job.
 */
export default function JobDetailNotAJobShell({
  jobId,
  children,
}: {
  jobId: string;
  children: ReactNode;
}) {
  const marked = useMarkedNotAJob(jobId);

  return (
    <>
      <JobNotAJobBanner jobId={jobId} />
      <div
        className={
          marked
            ? "opacity-40 grayscale pointer-events-none select-none"
            : undefined
        }
        aria-disabled={marked || undefined}
      >
        {children}
      </div>
    </>
  );
}
