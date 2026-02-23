"use client";

import { useEffect, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useRouter, useSearchParams } from "next/navigation";
import JobCard from "@/components/JobCard";
import { JobWithBookmark } from "@/types/job";
import Pagination from "@/components/Pagination";
import Footer from "@/components/Footer";

export default function BookmarksContent() {
  const { bookmarks } = useBookmarks();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithBookmark[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 10;

  const [loading, setLoading] = useState(true);

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
          <div className="flex items-center gap-2">
            <span className="text-lg text-slate-900">My Saved Jobs</span>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {bookmarks.length}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
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
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">
              You haven&apos;t saved any jobs yet.
            </p>
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
