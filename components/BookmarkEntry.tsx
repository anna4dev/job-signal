"use client";

import { useBookmarks } from "@/hooks/useBookmarks";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BookmarkEntry() {
  const { bookmarks } = useBookmarks();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady || bookmarks.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 xl:right-30 z-50">
      <Link
        href="/bookmarks"
        className="group flex items-center bg-blue-50 border border-blue-100 rounded-full shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 ease-in-out active:scale-95 max-w-11 lg:hover:max-w-50 overflow-hidden"
      >
        <div className="max-w-0 opacity-0 lg:group-hover:max-w-40 lg:group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap">
          <span className="pl-4 pr-2 text-[12px] font-bold text-slate-600">
            {bookmarks.length} {bookmarks.length === 1 ? "Job" : "Jobs"} Saved
          </span>
        </div>

        <div className="p-2.5 bg-blue-600 rounded-full shadow-sm group-hover:bg-blue-700 transition-colors shrink-0">
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21z" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
