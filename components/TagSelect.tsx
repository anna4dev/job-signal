"use client";

import { useEffect, useRef, useState } from "react";

interface TagSelectProps {
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  /**
   * Async function returning normalised suggestions for the given query.
   * Use a stable reference (module-level fn / useCallback) to prevent
   * unnecessary re-fetches on re-renders.
   */
  fetchSuggestions?: (query: string) => Promise<string[]>;
  /**
   * Allow adding values not present in the suggestion list (default: true).
   * Set false to restrict input to suggestions only (like StackFilter).
   */
  allowFreeText?: boolean;
  emptyMessage?: string;
}

/**
 * Controlled tag-select with a popup dropdown — same interaction pattern as
 * StackFilter (+ button → popup → search → select → tag added).
 *
 * Differs from StackFilter in that it:
 *   - is always controlled (no URL state ownership)
 *   - fetches suggestions lazily per keystroke (not upfront in bulk)
 *   - has no count badges (those are StackFilter-specific)
 *   - optionally allows free-text values not present in suggestions
 *
 * Use StackFilter for the jobs filter bar. Use TagSelect everywhere else.
 */
export default function TagSelect({
  tags,
  onAdd,
  onRemove,
  placeholder = "Search…",
  fetchSuggestions,
  allowFreeText = true,
  emptyMessage = "No results found",
}: TagSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Per-instance cache: prevents duplicate requests while typing.
  const localCache = useRef(new Map<string, string[]>());

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    const q = query.trim();
    if (!q || !fetchSuggestions) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const key = q.toLowerCase();
      if (localCache.current.has(key)) {
        const filtered = (localCache.current.get(key) ?? []).filter(
          (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
        );
        setSuggestions(filtered);
        setLoading(false);
        setActiveIdx(-1);
        return;
      }
      try {
        const data = await fetchSuggestions(q);
        localCache.current.set(key, data);
        const filtered = data.filter(
          (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
        );
        setSuggestions(filtered);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions, tags]);

  function open() {
    setIsOpen(true);
    setQuery("");
    setSuggestions([]);
    setActiveIdx(-1);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
    setSuggestions([]);
    setActiveIdx(-1);
  }

  function addValue(value: string) {
    const val = value.trim();
    if (!val) return;
    if (!tags.some((t) => t.toLowerCase() === val.toLowerCase())) {
      onAdd(val);
    }
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        addValue(suggestions[activeIdx]);
      } else if (allowFreeText && query.trim()) {
        addValue(query);
      }
    } else if (e.key === "Escape") {
      close();
    }
  }

  const trimmedQuery = query.trim();
  const showFreeTextOption =
    allowFreeText &&
    trimmedQuery.length > 0 &&
    !loading &&
    !suggestions.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !tags.some((t) => t.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected tags — click to remove */}
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onRemove(tag)}
            className="flex items-center bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group"
          >
            {tag}
            <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
              ×
            </span>
          </button>
        ))}

        {/* Trigger — positioned so popup anchors to it regardless of line wrapping */}
        <div className="relative">
          <button
            type="button"
            onClick={() => (isOpen ? close() : open())}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border border-dashed cursor-pointer transition-all active:scale-90 ${
              isOpen
                ? "border-blue-500 bg-blue-50 text-blue-500 rotate-45"
                : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="text-xl leading-none select-none">+</span>
          </button>

          {/* Popup */}
          {isOpen && (
            <div className="absolute left-0 top-10 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-slate-100">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="max-h-56 overflow-y-auto p-1">
                {loading && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Searching…
                  </div>
                )}

                {!loading &&
                  suggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addValue(s);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors cursor-pointer ${
                        i === activeIdx
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}

                {/* Free-text option when query has no exact match */}
                {showFreeTextOption && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addValue(query);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl transition-colors cursor-pointer text-slate-500 hover:bg-slate-50 border-t border-slate-100 mt-1"
                  >
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                      Add
                    </span>
                    <span className="font-medium text-slate-700 truncate">
                      &ldquo;{trimmedQuery}&rdquo;
                    </span>
                  </button>
                )}

                {!loading &&
                  suggestions.length === 0 &&
                  !showFreeTextOption &&
                  trimmedQuery && (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      {emptyMessage}
                    </div>
                  )}

                {!trimmedQuery && !loading && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {placeholder}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
