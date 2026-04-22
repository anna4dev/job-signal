"use client";

import { BookmarkStatus } from "@/types/job";
import { useBookmarks } from "@/hooks/useBookmarks";

// dot field removed — dot colors live in BOOKMARK_STATUS_DOT in types/job.ts
const DEFAULT_ACTIVE = "bg-slate-900 text-white border-slate-900 shadow-md";
const DEFAULT_INACTIVE = "bg-transparent text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600";
export const STATUS_META: Record<
  BookmarkStatus,
  { label: string; active: string; inactive: string }
> = {
  Saved: {
    label: "Saved",
    active: DEFAULT_ACTIVE,
    inactive: DEFAULT_INACTIVE,
  },
  Applied: {
    label: "Applied",
    active: DEFAULT_ACTIVE,
    inactive: DEFAULT_INACTIVE,
  },
  Interviewing: {
    label: "Interviewing",
    active: DEFAULT_ACTIVE,
    inactive: DEFAULT_INACTIVE,
  },
  Offer: {
    label: "Offer 🎉",
    active: "bg-emerald-700 text-white border-emerald-700 shadow-md",
    inactive: "bg-transparent text-slate-400 border-slate-100 hover:border-emerald-100 hover:text-emerald-700",
  },
  Rejected: {
    label: "Rejected",
    active: "bg-slate-400 text-white border-slate-400 shadow-sm",
    inactive: DEFAULT_INACTIVE,
  },
};

const STATUS_ORDER: BookmarkStatus[] = [
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

interface BookmarkStatusPickerProps {
  jobId: string;
  // undefined = user has never explicitly set a status
  currentStatus?: BookmarkStatus;
}

export default function BookmarkStatusPicker({
  jobId,
  currentStatus,
}: BookmarkStatusPickerProps) {
  const { setBookmarkStatus } = useBookmarks();

  // Display fallback only — never written to storage by this component on its own.
  const displayStatus: BookmarkStatus = currentStatus ?? "Saved";

  return (
    <div className="min-w-0 overflow-x-auto scrollbar-none">
      <div className="flex gap-2 p-1">
        {STATUS_ORDER.map((value) => {
          const meta = STATUS_META[value];
          const isActive = displayStatus === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setBookmarkStatus(jobId, value)}
              className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                isActive ? meta.active : meta.inactive
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
