"use client";

import { useMemo } from "react";
import { useJobEffectiveJob } from "@/hooks/useJobEffectiveJob";
import { BaseJobForOverrides } from "@/lib/jobOverrides";

export default function JobVisaSupportCard({
  jobId,
  baseVisaSupported,
  baseSalaryMin,
  baseSalaryMax,
  baseTechStack,
}: {
  jobId: string;
  baseVisaSupported: number | null;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
  baseTechStack: string[];
}) {
  const baseJob: BaseJobForOverrides = useMemo(
    () => ({
      job_id: jobId,
      salary_min: baseSalaryMin,
      salary_max: baseSalaryMax,
      location_visa_supported: baseVisaSupported,
      tech_stack: baseTechStack,
    }),
    [jobId, baseSalaryMin, baseSalaryMax, baseVisaSupported, baseTechStack],
  );

  const effective = useJobEffectiveJob(jobId, baseJob);

  const label =
    effective.location_visa_supported === true
      ? "Supported"
      : effective.location_visa_supported === false
        ? "Not Supported"
        : "Not mentioned";

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">Visa Support</p>
      <p className="font-semibold text-slate-900">{label}</p>
    </div>
  );
}

