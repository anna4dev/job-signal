"use client";

import { useEffect, useState } from "react";
import { JOB_OVERRIDES_EVENT } from "@/hooks/useJobEffectiveJob";
import {
  getJobOverridesFromLocalStorage,
  hasJobCorrectionReport,
  JOB_OVERRIDES_KEY,
} from "@/lib/jobOverrides";

/** True when this device has already submitted a correction for the job. */
export function useJobCorrectionReported(jobId: string): boolean {
  const [reported, setReported] = useState(false);

  useEffect(() => {
    const recompute = () => {
      const overrides = getJobOverridesFromLocalStorage();
      setReported(hasJobCorrectionReport(overrides[jobId]));
    };

    recompute();

    const onOverridesUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      const updatedJobId = custom?.detail?.jobId;
      if (!updatedJobId || String(updatedJobId) === String(jobId)) {
        recompute();
      }
    };

    window.addEventListener(JOB_OVERRIDES_EVENT, onOverridesUpdated);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== JOB_OVERRIDES_KEY) return;
      recompute();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(JOB_OVERRIDES_EVENT, onOverridesUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [jobId]);

  return reported;
}
