"use client";

import { useEffect, useMemo, useState } from "react";
import { useJobEffectiveJob } from "@/hooks/useJobEffectiveJob";
import { BaseJobForOverrides } from "@/lib/jobOverrides";

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

  const formatSalary = (val: number | null) => {
    if (val === null) return "";
    
    // greater than 1000, show in k
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    
    // less than 1000, just show the value
    return `${val}`;
  };
  
  const salaryText = useMemo(() => {
    // both null, show negotiable
    if (salaryMin == null && salaryMax == null) {
      return "Negotiable";
    }
    // min is not null, max is null, show min +
    if (salaryMin != null && salaryMax == null) {
      return `$${formatSalary(salaryMin)}+`;
    }
    // max is not null, min is null, show up to max
    if (salaryMin == null && salaryMax != null) {
      return `Up to $${formatSalary(salaryMax)}`;
    }
    // min equals to max, show min
    if (salaryMin === salaryMax) {
      return `$${formatSalary(salaryMin)}`;
    }
    return `$${formatSalary(salaryMin)} - $${formatSalary(salaryMax)}`;
  }, [salaryMin, salaryMax]);

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">Salary Range (USD)</p>
      <p className="font-semibold text-slate-900">
        {salaryText}
      </p>
    </div>
  );
}

