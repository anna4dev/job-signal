"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const BookmarkButton = dynamic(() => import("./BookmarkButton"), {
  ssr: false,
  loading: () => (
    <div className="w-9 h-9 bg-slate-100 animate-pulse rounded-lg" />
  ),
});

interface JobNavProps {
  jobId: string;
  website?: string;
  jdUrl?: string;
}

export default function JobDetailNav({ jobId, website, jdUrl }: JobNavProps) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
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
          Back to List
        </Link>

        <div className="flex gap-3 items-center">
          <BookmarkButton jobId={jobId} showText={false} />

          {website && (
            <a
              href={website}
              target="_blank"
              className="hidden sm:block text-sm px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              Website
            </a>
          )}

          {jdUrl && (
            <a
              href={jdUrl}
              target="_blank"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Apply Now
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
