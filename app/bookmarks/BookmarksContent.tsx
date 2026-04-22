"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useRouter, useSearchParams } from "next/navigation";
import JobCard from "@/components/JobCard";
import BookmarkStatusPicker from "@/components/BookmarkStatusPicker";
import { BookmarkItem, BookmarkStatus, JobWithBookmark } from "@/types/job";
import Pagination from "@/components/Pagination";
import Footer from "@/components/Footer";

type StatusTab = "All" | BookmarkStatus;

const TABS: StatusTab[] = [
  "All",
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

function matchesTab(item: BookmarkItem, tab: StatusTab): boolean {
  if (tab === "All") {
    // "All" hides Rejected — they only surface in the Rejected tab
    return item.status !== "Rejected";
  }
  if (tab === "Saved") {
    // Treats no-status (legacy / new) records as Saved for tab purposes
    return item.status === "Saved" || item.status === undefined;
  }
  return item.status === tab;
}

const PAGE_SIZE = 10;

export default function BookmarksContent() {
  const { bookmarks, clearAll } = useBookmarks();
  const searchParams = useSearchParams();
  const router = useRouter();

  const raw = searchParams.get("status");
  const activeTab: StatusTab = TABS.includes(raw as StatusTab) ? (raw as StatusTab) : "All";
  const currentPage = Number(searchParams.get("page")) || 1;

  const [jobs, setJobs] = useState<JobWithBookmark[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filtered + sorted bookmark list that drives pagination and fetch.
  // Sort key: status_updated_at (when user last acted) falling back to created_at, descending.
  const filteredBookmarks = useMemo(
    () =>
      bookmarks
        .filter((item) => matchesTab(item, activeTab))
        .sort((a, b) => {
          const aTime = a.status_updated_at ?? a.created_at;
          const bTime = b.status_updated_at ?? b.created_at;
          return bTime - aTime;
        }),
    [bookmarks, activeTab],
  );

  // Stable identity key derived from the actual payload sent to the API.
  // Changes whenever job membership or any status changes — catches same-length mutations
  // that filteredBookmarks.length alone would miss (e.g. Saved → Applied on the All tab).
  const filteredKey = useMemo(
    () => filteredBookmarks.map((b) => `${b.job_id}:${b.status ?? ""}`).join("|"),
    [filteredBookmarks],
  );

  // Per-tab counts
  const tabCounts = useMemo<Record<StatusTab, number>>(() => {
    const counts = {} as Record<StatusTab, number>;
    for (const tab of TABS) {
      counts[tab] = bookmarks.filter((item) => matchesTab(item, tab)).length;
    }
    return counts;
  }, [bookmarks]);

  function setTab(tab: StatusTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "All") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      if (filteredBookmarks.length === 0) {
        setJobs([]);
        setTotalPages(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/jobs/batch", {
          method: "POST",
          body: JSON.stringify({
            bookmarks: filteredBookmarks,
            page: currentPage,
            pageSize: PAGE_SIZE,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(data.totalPages || 0);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to load bookmarks", err);
      } finally {
        // Only clear loading flag if this fetch wasn't superseded
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [currentPage, filteredKey, activeTab]);

  // Keep displayed list in sync when a bookmark is removed mid-view
  useEffect(() => {
    if (jobs.length > 0) {
      setJobs((prev) =>
        prev.filter((job) =>
          filteredBookmarks.some((item) => item.job_id === job.job_id),
        ),
      );
    }
  }, [filteredBookmarks]);

  const confirmClear = () => {
    clearAll();
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <span className="text-base font-semibold text-slate-900">
              My Saved Jobs
            </span>
            {bookmarks.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white min-w-5">
                {bookmarks.length}
              </span>
            )}
          </div>

          {bookmarks.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="group flex items-center gap-1.5 text-sm font-medium cursor-pointer transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="text-slate-500 group-hover:text-rose-600">
                Clear All
              </span>
            </button>
          )}
        </div>

      </header>

      {/* Confirm Clear Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900">
              Clear all bookmarks?
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              This will remove all saved jobs and their statuses from your
              browser&apos;s local storage. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Tabs
            Desktop : normal inline-flex inside the max-w container.
            Mobile  : -mx-4 breaks out of parent px-4 so tabs are edge-to-edge;
                      overflow-x-auto enables horizontal swipe; min-w-max prevents wrapping. */}
        <div className="sticky top-13 z-20 backdrop-blur-md mb-6">
          <div className="overflow-x-auto scrollbar-none -mx-4 sm:mx-0">
            <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 min-w-max">
              {TABS.map((tab) => {
                const count = tabCounts[tab];
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setTab(tab)}
                    className={`
                      relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] transition-all duration-200
                      ${isActive
                        ? "font-bold bg-slate-900 text-white shadow-md scale-[1.02]"
                        : "font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }
                    `}
                  >
                    {tab}
                    {count > 0 && (
                      <span className={`
                        text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors
                        ${isActive ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-400"}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="flex flex-col gap-5">
            {jobs.map((job) => {
              const bookmark = bookmarks.find((b) => b.job_id === job.job_id);
              return (
                <div key={job.job_id} className="flex flex-col">
                  {bookmark && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="flex-1 text-sm text-slate-400 px-3">
                        {bookmark.status_updated_at
                          ? `Updated at ${new Date(bookmark.status_updated_at).toLocaleString()}`
                          : `Added on ${new Date(bookmark.created_at).toLocaleString()}`}
                      </div>
                      <BookmarkStatusPicker
                          jobId={job.job_id}
                          currentStatus={bookmark.status}
                        />
                    </div>
                  )}
                  <JobCard job={job} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="mb-6 relative">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-100 rounded-full border-2 border-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === "All"
                ? "Your collection is empty"
                : `No jobs in "${activeTab}"`}
            </h3>
            <p className="mt-3 text-slate-500 max-w-70 text-center text-[15px] leading-snug">
              {activeTab === "All" ? (
                <>
                  Save jobs to keep track of your favorites. Everything is kept{" "}
                  <span className="text-slate-900 font-medium">
                    private on this device
                  </span>
                  .
                </>
              ) : (
                <>Move a saved job to this stage to see it here.</>
              )}
            </p>
            {activeTab === "All" && (
              <button
                onClick={() => router.push("/")}
                className="mt-8 px-8 py-3 bg-slate-800 text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-slate-700 transition-all shadow-md active:scale-95"
              >
                Find Your Next Job
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        )}
        <Footer />
      </main>
    </div>
  );
}
