"use client";

import { useEffect, useMemo, useState } from "react";
import { useJobEffectiveJob } from "@/hooks/useJobEffectiveJob";
import { BaseJobForOverrides } from "@/lib/jobOverrides";
import { formatSalaryRange } from "@/lib/formatSalary";

export default function JobSalaryCard({
  jobId,
  baseSalaryMin,
  baseSalaryMax,
  baseVisaSupported,
  baseTechStack,
}: {
  jobId: string;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
  baseVisaSupported: number | null;
  baseTechStack: string[];
}) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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
  const salaryMin = isMounted ? effective.salary_min : baseSalaryMin;
  const salaryMax = isMounted ? effective.salary_max : baseSalaryMax;

  const salaryText = formatSalaryRange(salaryMin, salaryMax) ?? "Negotiable";

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">Salary Range (USD)</p>
      <p className="font-semibold text-slate-900">{salaryText}</p>
    </div>
  );
}
