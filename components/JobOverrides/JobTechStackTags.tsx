"use client";

import { useMemo, useState, useEffect } from "react";
import { BaseJobForOverrides } from "@/lib/jobOverrides";
import { useJobEffectiveJob } from "@/hooks/useJobEffectiveJob";

export default function JobTechStackTags({
  jobId,
  baseTechStack,
}: {
  jobId: string;
  baseTechStack: string[];
}) {
  const [isMounted, setIsMounted] = useState(false);

  // 使用 useEffect 并在下一帧更新状态，避免同步级联渲染
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const baseJob: BaseJobForOverrides = useMemo(
    () => ({
      job_id: jobId,
      salary_min: null,
      salary_max: null,
      location_visa_supported: null,
      tech_stack: baseTechStack,
    }),
    [jobId, baseTechStack],
  );

  const effective = useJobEffectiveJob(jobId, baseJob);

  // 这里的逻辑保持不变：SSR 期间用 base，挂载后用 effective
  const displayStack = isMounted ? effective.tech_stack : baseTechStack;

  return (
    <>
      {displayStack.map((tech) => (
        <span
          key={tech}
          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
        >
          {tech}
        </span>
      ))}
    </>
  );
}
