"use client";

import {
  getNormalizedSnapshot,
  useSavedSearches,
} from "@/hooks/useSavedSearches";
import { SavedSearchItem } from "@/types/search";
import { useSearchParams } from "next/navigation";
import router from "next/router";
import { useState, useMemo, useRef, useEffect } from "react";

export default function MonitorSearch() {
  const searchParams = useSearchParams();
  const { savedSearches, saveSearch } = useSavedSearches();
  const [isSaving, setIsSaving] = useState(false);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const currentSnapshot = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries());
    delete params.page;
    return JSON.stringify(params);
  }, [searchParams]);

  const existingSearch = useMemo(() => {
    const current = getNormalizedSnapshot(
      Object.fromEntries(searchParams.entries()),
    );
    return savedSearches.find(
      (s) => getNormalizedSnapshot(s.filters) === current,
    );
  }, [savedSearches, searchParams]);

  const autoName = useMemo(() => {
    const query = searchParams.get("q");
    const level = searchParams.get("level");
    const minSalary = searchParams.get("min_salary");
    const isRemote = searchParams.get("remote") === "true";
    const isUSA = searchParams.get("usa") === "true";
    const isIntl = searchParams.get("intl") === "true";
    const stacks = searchParams.get("stack")?.split(",").filter(Boolean) || [];
    const stackLabel =
      stacks.length > 0
        ? stacks.length > 2
          ? `${stacks.slice(0, 2).join("/")}...`
          : stacks.join("/")
        : "";
    return (
      [
        query,
        isRemote ? "Remote" : "",
        isUSA ? "USA" : isIntl ? "Outside USA" : "",
        level,
        minSalary && minSalary !== "0"
          ? `$${Math.round(Number(minSalary) / 1000)}k+`
          : "",
        stackLabel,
      ]
        .filter(Boolean)
        .join(" · ") || "My Search"
    );
  }, [searchParams]);

  const handleConfirmSave = () => {
    const name = saveInputRef.current?.value || autoName;
    const filters = Object.fromEntries(searchParams.entries());

    delete filters.page;
    saveSearch(name, filters);
    setIsSaving(false);
    // 视觉反馈：关闭输入框
    setIsSaving(false);
  };

  if (
    !mounted ||
    currentSnapshot === "{}" ||
    currentSnapshot === '{"page":"1"}'
  )
    return null;

  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-slate-700">
            {existingSearch ? "Monitoring" : "Save Search"}
          </span>
        </div>

        <button
          onClick={() => !existingSearch && setIsSaving(!isSaving)}
          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
            isSaving || existingSearch ? "bg-blue-600" : "bg-slate-200"
          } ${existingSearch ? "cursor-default" : "cursor-pointer"}`}
        >
          <span
            className={`h-2.5 w-2.5 transform rounded-full bg-white transition ${
              isSaving || existingSearch ? "translate-x-4.5" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 只有在非展示态才展开输入框 */}
      {!existingSearch && isSaving && (
        <div className="mt-3 pt-2 border-t border-slate-200/50 animate-in slide-in-from-top-1">
          <input
            ref={saveInputRef}
            placeholder="Name your search..."
            defaultValue={autoName}
            className="w-full px-2 py-1.5 text-xs border rounded-md outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setIsSaving(false)}
              className="text-xs text-slate-400 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {existingSearch && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-blue-600 font-medium truncate">
            {existingSearch.name}
          </span>
          <button className="text-xs font-bold text-slate-400 hover:text-blue-500">
            Saved List →
          </button>
        </div>
      )}
    </div>
  );
}
