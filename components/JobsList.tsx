"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import JobCard from "@/components/JobCard";
import Pagination from "@/components/Pagination";
import SortToggle from "@/components/SortToggle";
import { useUnifiedSignals } from "@/hooks/useUnifiedSignals";
import { useExplicitProfile } from "@/hooks/useExplicitProfile";
import { isProfileEmpty } from "@/lib/profile";
import { fit, toFitJobInput } from "@/lib/fit";
import { trackFitEvents, type FitEventPayload } from "@/lib/fitEvents";
import {
  rememberJobSortMode,
  type JobSortMode,
} from "@/lib/jobSort";
import type { JobWithCompany } from "@/types/job";
import type { FitResult } from "@/types/fit";

const PAGE_SIZE = 10;

type AnnotatedJob = {
  job: JobWithCompany;
  fitResult: FitResult;
};

interface JobsListProps {
  jobs: JobWithCompany[];
  sort: JobSortMode;
  /** Server-side total for newest/pay; ignored for fit (uses candidate pool). */
  total: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Client job list. Annotates each job with a local fit result, optionally
 * re-orders by fit, paginates the visible set, and emits fit observability
 * events (impression / open / bookmark). Fit UI is suppressed for empty
 * profiles, where scoring is neutral and misleading.
 */
export default function JobsList({
  jobs,
  sort,
  total,
  currentPage,
  totalPages,
}: JobsListProps) {
  const signals = useUnifiedSignals();
  const { profile } = useExplicitProfile();
  const profileEmpty = isProfileEmpty(profile);

  const annotated: AnnotatedJob[] = useMemo(
    () =>
      jobs.map((job) => ({
        job,
        fitResult: fit(toFitJobInput(job), signals),
      })),
    [jobs, signals],
  );

  const ordered = useMemo(() => {
    if (sort !== "fit") return annotated;
    return [...annotated].sort((a, b) => {
      if (a.fitResult.hardFail !== b.fitResult.hardFail) {
        return a.fitResult.hardFail ? 1 : -1;
      }
      return b.fitResult.fitScore - a.fitResult.fitScore;
    });
  }, [annotated, sort]);

  const fitTotalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const pageOffset = (currentPage - 1) * PAGE_SIZE;
  const displayJobs =
    sort === "fit"
      ? ordered.slice(pageOffset, pageOffset + PAGE_SIZE)
      : ordered;

  const displayTotal = sort === "fit" ? ordered.length : total;
  const displayTotalPages = sort === "fit" ? fitTotalPages : totalPages;

  const impressionKey = displayJobs.map(({ job }) => job.job_id).join(",");

  useEffect(() => {
    rememberJobSortMode(sort);
  }, [sort]);

  useEffect(() => {
    if (displayJobs.length === 0) return;
    trackFitEvents(
      displayJobs.map(({ job, fitResult }, index) => ({
        job_id: job.job_id,
        event_type: "impression",
        fit_score: fitResult.fitScore,
        hard_fail: fitResult.hardFail,
        sort_mode: sort,
        position: pageOffset + index,
      })),
    );
    // Re-fire when the visible job set / sort / page changes — not on every fit recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- impressionKey encodes visible jobs
  }, [impressionKey, sort, pageOffset]);

  /** Build a fit event for a visible job, or null if it is not on the page. */
  function eventFor(
    jobId: string,
    event_type: FitEventPayload["event_type"],
  ): FitEventPayload | null {
    const index = displayJobs.findIndex(({ job }) => job.job_id === jobId);
    if (index < 0) return null;
    const { fitResult } = displayJobs[index];
    return {
      job_id: jobId,
      event_type,
      fit_score: fitResult.fitScore,
      hard_fail: fitResult.hardFail,
      sort_mode: sort,
      position: pageOffset + index,
    };
  }

  /** Record an `open` fit event when a job card is opened. */
  function handleOpenJob(jobId: string) {
    const event = eventFor(jobId, "open");
    if (event) trackFitEvents([event]);
  }

  /** Record a bookmark add/remove fit event from a job card toggle. */
  function handleBookmarkToggle(jobId: string, nowBookmarked: boolean) {
    const event = eventFor(
      jobId,
      nowBookmarked ? "bookmark_add" : "bookmark_remove",
    );
    if (event) trackFitEvents([event]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
        <span>
          {sort === "fit"
            ? `Ranking ${displayTotal} recent matches by fit`
            : `Found ${displayTotal} matching jobs`}
        </span>
        <SortToggle />
      </div>

      {sort === "fit" && profileEmpty ? (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          Profile looks empty — Best Fit works better with preferences.{" "}
          <Link
            href="/profile"
            className="font-semibold text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            Edit profile
          </Link>
        </p>
      ) : null}

      {sort === "fit" ? (
        <p className="text-[11px] text-slate-400">
          Scored from the most recent matching jobs (up to 100). Fit uses your
          local profile signals.
        </p>
      ) : null}

      {displayJobs.map(({ job, fitResult }) => (
        <JobCard
          key={job.job_id}
          job={job}
          fitScore={profileEmpty ? undefined : fitResult.fitScore}
          reasonTags={profileEmpty ? undefined : fitResult.reasonTags}
          hardFail={profileEmpty ? undefined : fitResult.hardFail}
          onOpenJob={handleOpenJob}
          onBookmarkToggle={handleBookmarkToggle}
        />
      ))}

      {displayTotalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={displayTotalPages}
        />
      )}

      {displayJobs.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-gray-400 border-dashed">
          <p className="text-gray-400">
            No jobs found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
