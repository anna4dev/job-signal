"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BaseJobForOverrides,
  EffectiveJobForOverrides,
  getJobOverridesFromLocalStorage,
  mergeJobWithOverrides,
  JOB_OVERRIDES_KEY,
} from "@/lib/jobOverrides";

export const JOB_OVERRIDES_EVENT = "job-overrides-change";

export function useJobEffectiveJob(
  jobId: string,
  baseJob: BaseJobForOverrides,
): EffectiveJobForOverrides {
  const [effective, setEffective] = useState<EffectiveJobForOverrides>(
    () => {
      const overrides = getJobOverridesFromLocalStorage();
      return mergeJobWithOverrides(baseJob, overrides[jobId]);
    },
  );

  const baseJobMemo = useMemo(() => baseJob, [jobId, baseJob]);

  useEffect(() => {
    const recompute = () => {
      const overrides = getJobOverridesFromLocalStorage();
      setEffective(mergeJobWithOverrides(baseJobMemo, overrides[jobId]));
    };

    recompute();

    const onOverridesUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      const updatedJobId = custom?.detail?.jobId;
      if (!updatedJobId || updatedJobId === jobId) recompute();
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
  }, [baseJobMemo, jobId]);

  return effective;
}

