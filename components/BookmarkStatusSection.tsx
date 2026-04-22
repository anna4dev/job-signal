"use client";

import { useBookmarks } from "@/hooks/useBookmarks";
import BookmarkStatusPicker from "@/components/BookmarkStatusPicker";

export default function BookmarkStatusSection({ jobId }: { jobId: string }) {
  const { bookmarks } = useBookmarks();
  const bookmark = bookmarks.find((b) => b.job_id === jobId);

  if (!bookmark) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-tight">
        Application Status
      </h3>
      <BookmarkStatusPicker
        jobId={jobId}
        currentStatus={bookmark.status}
      />
    </section>
  );
}
