"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SegmentedControl from "@/components/SegmentedControl";
import { trackFitEvents } from "@/lib/fitEvents";
import {
  JOB_SORT_OPTIONS,
  parseJobSortMode,
  rememberJobSortMode,
  type JobSortMode,
} from "@/lib/jobSort";

export default function SortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = parseJobSortMode(searchParams.get("sort"));

  const onSelect = (value: JobSortMode) => {
    if (value !== selected) {
      trackFitEvents([
        {
          event_type: "sort_change",
          sort_mode: `${selected}->${value}`,
        },
      ]);
    }
    rememberJobSortMode(value);
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
