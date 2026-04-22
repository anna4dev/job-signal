"use client";

import { useBookmarks } from "@/hooks/useBookmarks";
import { BOOKMARK_STATUS_DOT } from "@/types/job";

export default function BookmarkButton({
  jobId,
  showText = true,
  size = "md",
}: {
  jobId: string;
  showText?: boolean;
  size?: "sm" | "md";
}) {
  const { bookmarks, toggleBookmark } = useBookmarks();
  const bookmark = bookmarks.find((item) => item.job_id === jobId);
  const isBookmarked = !!bookmark;

  // dot color reflects explicit status; no dot if status was never set
  const dotColor = bookmark?.status
    ? BOOKMARK_STATUS_DOT[bookmark.status]
    : null;

  const sizes = {
    sm: { icon: "w-5 h-5", button: "p-1", dot: "bottom-0.5 right-0.5 w-2 h-2" },
    md: { icon: "w-6 h-6", button: "p-2", dot: "bottom-1 right-1.5 w-2.5 h-2.5" },
  };

  return (
    <button
      onClick={() => toggleBookmark(jobId)}
      className={`relative flex items-center cursor-pointer transition-all duration-200 rounded-full hover:bg-slate-50 ${
        sizes[size].button
      } ${isBookmarked ? "text-blue-600" : "text-slate-400 hover:text-blue-600"}`}
      title={isBookmarked ? "Remove from bookmarks" : "Save for later"}
    >
      <svg
        className={`${sizes[size].icon} ${isBookmarked ? "fill-current" : "fill-none"}`}
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>

      {/* Status dot — only when bookmarked and user has explicitly set a status */}
      {isBookmarked && dotColor && (
        <span
          className={`absolute ${sizes[size].dot} rounded-full border border-white ${dotColor}`}
        />
      )}

      {showText && (
        <span className="text-sm font-semibold ml-1">
          {isBookmarked ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}
