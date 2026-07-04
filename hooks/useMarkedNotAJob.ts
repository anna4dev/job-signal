"use client";

import { useEffect, useState } from "react";
import { JOB_OVERRIDES_EVENT } from "@/hooks/useJobEffectiveJob";
import {
  getJobOverridesFromLocalStorage,
  isMarkedNotAJob,
  JOB_OVERRIDES_KEY,
} from "@/lib/jobOverrides";

/** True when this device has locally marked the listing as not a job. */
export function useMarkedNotAJob(jobId: string): boolean {
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    const recompute = () => {
      const overrides = getJobOverridesFromLocalStorage();
      setMarked(isMarkedNotAJob(overrides[jobId]));
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

  return marked;
}
