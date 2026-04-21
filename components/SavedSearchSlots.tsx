"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  forwardRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { motion } from "framer-motion";

/** Tailwind `gap-2` → 0.5rem → 8px at default root font size */
const CHIP_ROW_GAP_PX = 8;

function countVisibleInFirstRow(
  containerWidth: number,
  chipWidths: number[],
  gap: number
): number {
  if (containerWidth <= 0) return 0;
  let rowUsed = 0;
  let count = 0;
  for (let i = 0; i < chipWidths.length; i++) {
    const w = chipWidths[i];
    if (w <= 0) break;
    const extra = i === 0 ? w : gap + w;
    if (rowUsed + extra <= containerWidth) {
      rowUsed += extra;
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * rules:
 * 1) sidebarMode  → flex-wrap + maxHeight animation
 * 2) non sidebarMode → always flex-nowrap + horizontal scroll (no animation)
 * 3) two sets of DOM, not share layout
 */

export default function SavedSearchSlots() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { savedSearches, removeSearch, touchSearch } = useSavedSearches();

  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(false);
  const [visibleInFirstRow, setVisibleInFirstRow] = useState<number | null>(
    null
  );

  const sidebarWrapRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);

  const chipLayoutKey = useMemo(
    () => savedSearches.map((s) => `${s.id}:${s.name}`).join("|"),
    [savedSearches]
  );

  useLayoutEffect(() => {
    if (!sidebarMode) {
      setVisibleInFirstRow(null);
      return;
    }

    const measure = () => {
      const wrap = sidebarWrapRef.current;
      if (!wrap) return;
      const cw = wrap.clientWidth;
      const widths = savedSearches.map(
        (_, i) => chipRefs.current[i]?.offsetWidth ?? 0
      );
      setVisibleInFirstRow(
        countVisibleInFirstRow(cw, widths, CHIP_ROW_GAP_PX)
      );
    };

    measure();

    const wrap = sidebarWrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sidebarMode, chipLayoutKey]);

  useEffect(() => {
    const checkMode = () => {
      setSidebarMode(window.innerWidth >= 1024);
    };

    checkMode();

    window.addEventListener("resize", checkMode);
    return () => window.removeEventListener("resize", checkMode);
  }, []);

  const isMatch = (filters: Record<string, string>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("page");

    const savedParams = new URLSearchParams(filters);
    savedParams.delete("page");

    currentParams.sort();
    savedParams.sort();

    return currentParams.toString() === savedParams.toString();
  };

  // only calculate once active, avoid recalculating for each item
  const activeId = useMemo(() => {
    for (const item of savedSearches) {
      if (isMatch(item.filters)) return item.id;
    }
    return null;
  }, [searchParams, savedSearches]);

  // stable order
  const items = savedSearches;

  if (items.length === 0) return null;

  const hiddenCount =
    visibleInFirstRow != null
      ? Math.max(0, items.length - visibleInFirstRow)
      : Math.max(0, items.length - 1);
  const needsSidebarToggle =
    sidebarMode &&
    (visibleInFirstRow != null
      ? visibleInFirstRow < items.length
      : items.length > 1);

  return (
    <div className="space-y-2">
      {/* header never participates in animation */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Saved Searches
        </p>

        {needsSidebarToggle && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isExpanded ? "Hide" : `+${hiddenCount} more`}
          </button>
        )}
      </div>

      {/* ========== non sidebar：horizontal scroll (no animation) ========== */}
      {!sidebarMode && (
        <div className="no-scrollbar overflow-x-auto">
          <div className="flex items-center gap-2 pb-1 flex-nowrap">
            {items.map((item) => {
              const active = item.id === activeId;

              return (
                <Chip
                  key={item.id}
                  item={item}
                  active={active}
                  onClick={() => {
                    const params = new URLSearchParams(item.filters);
                    params.delete("page");
                    touchSearch(item.id);
                    router.push(
                      params.toString()
                        ? `${pathname}?${params.toString()}`
                        : pathname
                    );
                  }}
                  onRemove={() => removeSearch(item.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ========== sidebar：multiple lines + height animation ========== */}
      {sidebarMode && (
        <div className="overflow-hidden">
          <motion.div
            ref={sidebarWrapRef}
            // only do height, not layout
            animate={{ maxHeight: isExpanded ? 200 : 32 }}
            transition={{ duration: 0.25 }}
            className="flex flex-wrap gap-2"
          >
            {items.map((item, i) => {
              const active = item.id === activeId;

              return (
                <Chip
                  key={item.id}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  item={item}
                  active={active}
                  onClick={() => {
                    const params = new URLSearchParams(item.filters);
                    params.delete("page");
                    touchSearch(item.id);
                    router.push(
                      params.toString()
                        ? `${pathname}?${params.toString()}`
                        : pathname
                    );
                  }}
                  onRemove={() => removeSearch(item.id)}
                />
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}

/** single responsibility: pure display, not participate in animation */
const Chip = forwardRef<
  HTMLDivElement,
  {
    item: any;
    active: boolean;
    onClick: () => void;
    onRemove: () => void;
  }
>(function Chip({ item, active, onClick, onRemove }, ref) {
  return (
    <div
      ref={ref}
      className={`group inline-flex items-center rounded-full border transition-colors shrink-0 ${
        active
          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20"
          : "border-slate-200 bg-white hover:border-blue-300 shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-l-full transition-colors ${
          active
            ? "text-blue-700"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {item.name}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex items-center justify-center pr-2 py-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-r-full"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
});