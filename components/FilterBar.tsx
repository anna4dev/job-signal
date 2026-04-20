"use client";

import { useRouter, useSearchParams } from "next/navigation";
import StackFilter from "./StackFilter";
import { useEffect, useMemo, useState } from "react";
import SavedSearchSlots from "./SavedSearchSlots";
import {
  ActionWithFeedback,
  useTransientFeedback,
} from "./ActionWithFeedback";
import { useSavedSearches } from "@/hooks/useSavedSearches";

// Normalize a filter set so no-op values (page, min_salary=0, whitespace-only q,
// empty strings) are stripped. Returned params are sorted for stable stringification.
function canonicalizeFilters(
  input: string | URLSearchParams | Record<string, string>,
): URLSearchParams {
  const p = new URLSearchParams(input);
  p.delete("page");

  const q = p.get("q")?.trim() ?? "";
  if (q) p.set("q", q);
  else p.delete("q");

  if (p.get("min_salary") === "0") p.delete("min_salary");

  for (const key of Array.from(p.keys())) {
    if (!p.get(key)) p.delete(key);
  }
  p.sort();
  return p;
}

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveSearch, savedSearches } = useSavedSearches();

  // Helper method to update URL parameters
  const updateFilters = (
    updates: Record<string, string | boolean | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === false || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    // Reset to page 1 on filter change
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const currentDays = searchParams.get("days") || "";
  const currentLevel = searchParams.get("level") || "";

  const qFromUrl = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(qFromUrl);
  useEffect(() => {
    setInputValue(qFromUrl);
  }, [qFromUrl]);
  const { feedback: saveFeedback, show: showSaveFeedback } =
    useTransientFeedback(1800);

  // Shared by the save button state, saveSearch payload, and duplicate check.
  const canonicalFilters = useMemo(
    () => canonicalizeFilters(searchParams),
    [searchParams],
  );
  const canonicalKey = canonicalFilters.toString();
  const hasMeaningfulFilters = canonicalKey !== "";

  const autoName = useMemo(() => {
    const query = searchParams.get("q");
    const level = searchParams.get("level");
    const minSalary = searchParams.get("min_salary");
    const days = searchParams.get("days") || "";
    const recencyToken =
      days && /^\d+$/.test(days) ? `${days}d` : "";
    const isRemote = searchParams.get("remote") === "true";
    const isVisa = searchParams.get("visa") === "true";
    const isUSA = searchParams.get("usa") === "true";
    const isIntl = searchParams.get("intl") === "true";
    const stacks = searchParams.get("stack")?.split(",").filter(Boolean) || [];
    const stackLabel =
      stacks.length > 0
        ? stacks.length > 2
          ? `${stacks.slice(0, 2).join("/")}...`
          : stacks.join("/")
        : "";
    const primaryTitle = [query, stackLabel].filter(Boolean).join(" ");
    return (
      [
        primaryTitle,                                 // 1. ai Python/React
        level,                                        // 2. mid
        minSalary && minSalary !== "0" 
          ? `$${Math.round(Number(minSalary) / 1000)}k+` 
          : "",                                       // 3. $150k+
        isUSA ? "USA" : isIntl ? "Intl" : "",         // 4. USA/Intl
        isRemote ? "Remote" : "",                     
        isVisa ? "Visa" : "",                         // 6. Visa
        recencyToken,                                 // 7. 7d / 30d when Date Posted is set
      ].filter(Boolean)
        .join(" · ") || "My Search"
    ); 
  }, [searchParams]);
  const saveCurrentSearch = () => {
    if (!hasMeaningfulFilters) return;
    const filters = Object.fromEntries(canonicalFilters.entries());
    const result = saveSearch(autoName, filters);
    if (result.ok) {
      showSaveFeedback({ text: "Saved", tone: "success" });
      return;
    }
    if (result.reason === "max_reached") {
      showSaveFeedback({
        text: "Limit: 5 saved searches. Remove one first.",
        tone: "warning",
      });
      return;
    } 
    if(result.reason === "duplicate") {
      showSaveFeedback({
        text: "Same search already saved.",
        tone: "info",
      });
      return;
    }
    showSaveFeedback({
      text: "Something went wrong. Please try again.",
      tone: "warning",
    });
  };

  const isAlreadySaved = useMemo(() => {
    if (!canonicalKey) return false;
    return savedSearches.some(
      (s) => canonicalizeFilters(s.filters).toString() === canonicalKey,
    );
  }, [savedSearches, canonicalKey]);

  return (
    <div className="space-y-4 sticky top-4">
      <SavedSearchSlots />
      {/* 1. Keyword Search */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
          Search Jobs / Companies
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. Rust, Frontend"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilters({ q: inputValue || undefined });
              }
            }}
          />
        </div>
      </div>
      <StackFilter />
      {/* 2. Location Scope (New) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">
          Job Location
        </label>
        <div className="mt-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={searchParams.get("usa") === "true"}
              onChange={(e) => updateFilters({ usa: e.target.checked })}
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900">
              United States
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={searchParams.get("intl") === "true"}
              onChange={(e) => updateFilters({ intl: e.target.checked })}
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900">
              Outside USA
            </span>
          </label>
        </div>
      </div>
      {/* 3. Core Requirements */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">
          Work Style & Visa
        </label>
        <div className="mt-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={searchParams.get("remote") === "true"}
              onChange={(e) => updateFilters({ remote: e.target.checked })}
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900">
              Remote
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={searchParams.get("visa") === "true"}
              onChange={(e) => updateFilters({ visa: e.target.checked })}
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900">
              Visa Sponsorship Supported
            </span>
          </label>
        </div>
      </div>
      {/* 4. Experience Level */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
          Level
        </label>
        <select
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={currentLevel}
          onChange={(e) => updateFilters({ level: e.target.value })}
        >
          <option value="">All Levels</option>
          <option value="junior">Junior / Intern</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff / Principal</option>
        </select>
      </div>
      {/* 2. Posted Date (Recency) */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
          Date Posted
        </label>
        <select
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={currentDays}
          onChange={(e) => updateFilters({ days: e.target.value })}
        >
          {[
            { label: "All Time", value: "" },
            { label: "Past 3 Days", value: "3" },
            { label: "Past 7 Days", value: "7" },
            { label: "This Month", value: "30" },
          ].map((item) => (
            <option
              key={item.value}
              value={item.value}
              onClick={() => updateFilters({ days: item.value })}
            >
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {/* 5. Salary Threshold */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
          Min Annual Salary (USD)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="300000"
            step="10000"
            className="flex-1 accent-blue-600"
            value={searchParams.get("min_salary") || "0"}
            onChange={(e) => updateFilters({ min_salary: e.target.value })}
          />
          <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">
            ${Math.round(Number(searchParams.get("min_salary") || 0) / 1000)}k
          </span>
        </div>
      </div>
      {/* 6. Clear All Filters */}
      <div
        className={`w-full transition-all ${
          searchParams.toString() !== "" && searchParams.toString() !== "page=1"
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setInputValue("");
              router.push("/");
            }}
            className="py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all px-2"
          >
            Clear All Filters
          </button>
          {hasMeaningfulFilters && (
            <ActionWithFeedback feedback={saveFeedback}>
              <button
                type="button"
                onClick={saveCurrentSearch}
                disabled={isAlreadySaved}
                className={`text-xs font-bold rounded-md transition-all ${
                  isAlreadySaved
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-blue-600 cursor-pointer"
                }`}
              >
                {isAlreadySaved ? "Saved to Monitoring" : "Save Current"}
              </button>
            </ActionWithFeedback>
          )}
        </div>
      </div>
      {/* 7. AD */}
      <div className="mt-10 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900">About this tool</h3>
        <p className="text-xs text-blue-700 mt-2 leading-relaxed">
          I built this to make HN job hunting easier. Want to see more of my
          work?
        </p>
        <a
          href="https://anna4code.dev/projects"
          target="_blank"
          className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          Visit my Projects →
        </a>
      </div>
    </div>
  );
}
