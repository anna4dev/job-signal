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
          marked ? "opacity-40 grayscale select-none" : undefined
        }
        // inert blocks pointer + keyboard/AT focus inside (pointer-events-none alone does not)
        {...(marked ? { inert: true as const } : {})}
      >
        {children}
      </div>
    </>
  );
}
