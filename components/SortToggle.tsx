"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SegmentedControl from "@/components/SegmentedControl";
import {
  JOB_SORT_OPTIONS,
  parseJobSortMode,
  type JobSortMode,
} from "@/lib/jobSort";

export default function SortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = parseJobSortMode(searchParams.get("sort"));

  const onSelect = (value: JobSortMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "/");
  };

  return (
    <div className="w-full max-w-md">
      <SegmentedControl
        options={JOB_SORT_OPTIONS}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}
