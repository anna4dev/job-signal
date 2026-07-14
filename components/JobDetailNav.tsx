"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import DetailTopNav from "@/components/DetailTopNav";
import { useUnifiedSignals } from "@/hooks/useUnifiedSignals";
import { fit } from "@/lib/fit";
import { trackFitEvents } from "@/lib/fitEvents";
import { getRememberedJobSortMode } from "@/lib/jobSort";
import type { FitJobInput } from "@/types/fit";

const BookmarkButton = dynamic(() => import("./BookmarkButton"), {
  ssr: false,
  loading: () => (
    <div className="w-9 h-9 bg-slate-100 animate-pulse rounded-lg" />
  ),
});

interface JobNavProps {
  jobId: string;
  fitJob: FitJobInput;
  website?: string;
  jdUrl?: string;
}

export default function JobDetailNav({
  jobId,
  fitJob,
  website,
  jdUrl,
}: JobNavProps) {
  const signals = useUnifiedSignals();
  const fitResult = useMemo(() => fit(fitJob, signals), [fitJob, signals]);

  const handleBookmarkToggle = (_id: string, nowBookmarked: boolean) => {
    trackFitEvents([
      {
        job_id: jobId,
        event_type: nowBookmarked ? "bookmark_add" : "bookmark_remove",
        fit_score: fitResult.fitScore,
        hard_fail: fitResult.hardFail,
        sort_mode: getRememberedJobSortMode(),
      },
    ]);
  };

  return (
    <DetailTopNav
      fallbackHref="/"
      actions={
        <>
          <BookmarkButton
            jobId={jobId}
            showText={false}
            onAfterToggle={handleBookmarkToggle}
          />

          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              Website
            </a>
          ) : null}

          {jdUrl ? (
            <a
              href={jdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Apply Now
            </a>
          ) : null}
        </>
      }
    />
  );
}
