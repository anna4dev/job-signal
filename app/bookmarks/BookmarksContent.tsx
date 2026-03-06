"use client";

import { useEffect, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useRouter, useSearchParams } from "next/navigation";
import JobCard from "@/components/JobCard";
import { JobWithBookmark } from "@/types/job";
import Pagination from "@/components/Pagination";
import Footer from "@/components/Footer";

export default function BookmarksContent() {
  const { bookmarks, clearAll } = useBookmarks();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithBookmark[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (bookmarks.length === 0) {
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
            bookmarks,
            page: currentPage,
            pageSize,
          }),
          cache: "no-store",
        });
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(data.totalPages || 0);
      } catch (err) {
        console.error("Failed to load bookmarks", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentPage, bookmarks.length]);

  useEffect(() => {
    if (jobs.length > 0) {
      setJobs((prev) =>
        prev.filter((job) =>
          bookmarks.some((item) => item.job_id === job.job_id),
        ),
      );
    }
  }, [bookmarks]);

  const handleClearClick = () => {
    if (bookmarks.length === 0) return;
    setShowConfirm(true);
  };

  const confirmClear = () => {
    clearAll(); // remove all bookmarks
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 min-w-5">
                {bookmarks.length}
              </span>
            )}
          </div>
          {bookmarks.length > 0 && (
            <button
              onClick={handleClearClick}
              disabled={bookmarks.length === 0}
              className="group flex items-center gap-1.5 text-sm font-medium cursor-pointer transition-colors"
            >
              <svg
                className={`w-4 h-4 ${bookmarks.length > 0 ? "text-slate-400 group-hover:text-rose-600" : "text-slate-200"}`}
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
              <span
                className={
                  bookmarks.length > 0
                    ? "text-slate-500 group-hover:text-rose-600"
                    : "text-slate-300"
                }
              >
                Clear All
              </span>
            </button>
          )}
        </div>
      </header>

      {showConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900">
              Clear all bookmarks?
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              This will remove all saved jobs from your browser&apos;s local
              storage. This action cannot be undone.
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {jobs.length > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2 text-slate-400">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-[11px] tracking-wide uppercase font-medium">
              Device-only storage • Private browsing
            </p>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard key={job.job_id} job={job} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            {/* empty container */}
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
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-100 rounded-full border-2 border-white"></div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Your collection is empty
            </h3>
            <p className="mt-3 text-slate-500 max-w-70 text-center text-[15px] leading-snug">
              Save jobs to keep track of your favorites. Everything is kept{" "}
              <span className="text-slate-900 font-medium">
                private on this device
              </span>
              .
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-8 px-8 py-3 bg-slate-800 text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-slate-700 transition-all shadow-md active:scale-95"
            >
              Find Your Next Job
            </button>
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
