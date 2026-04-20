"use client";

import { useRouter } from "next/navigation";
import { useSavedSearches, SavedSearchItem } from "@/hooks/useSavedSearches";

interface SavedSearchListProps {
  onApply: () => void;
}

export default function SavedSearchList({ onApply }: SavedSearchListProps) {
  const router = useRouter();
  const { savedSearches, removeSearch } = useSavedSearches();

  const handleApply = (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    router.push(`/?${params.toString()}`);
    onApply();
  };

  if (savedSearches.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xs text-slate-400 font-medium text-balance">
          No saved searches yet. Create one to monitor new jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedSearches.map((item: SavedSearchItem) => (
        <div
          key={item.id}
          className="group flex gap-2 items-start p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <button
            type="button"
            className="flex-1 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            onClick={() => handleApply(item.filters)}
            aria-label={`Apply saved search: ${item.name}`}
          >
            <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
              {item.name}
            </h4>

            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(item.filters).map(
                ([key, value]) =>
                  value &&
                  key !== "page" && (
                    <span
                      key={key}
                      className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold tracking-tighter"
                    >
                      {key === "q" ? value : `${key}:${value}`}
                    </span>
                  ),
              )}
            </div>
            <p className="text-[9px] text-slate-300 mt-2 font-medium italic">
              Saved on {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </button>
          <button
            type="button"
            onClick={() => removeSearch(item.id)}
            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
            aria-label={`Remove saved search ${item.name}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
