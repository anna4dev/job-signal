"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface StackOption {
  name: string;
  count: number;
}

export default function StackFilter({
  value,
  onChange,
}: {
  value?: string[];
  onChange?: (next: string[]) => void;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isControlled =
    Array.isArray(value) && typeof onChange === "function";

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StackOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/jobs/stack", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOptions(data);
      })
      .catch((err) => console.error("Fetch stacks failed", err));
  }, []);

  const selectedStacks = useMemo(() => {
    if (isControlled) return value || [];
    return searchParams.get("stack")?.split(",").filter(Boolean) || [];
  }, [isControlled, searchParams, value]);

  const updateFilters = (newStacks: string[]) => {
    if (isControlled) {
      onChange?.(newStacks);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (newStacks.length > 0) params.set("stack", newStacks.join(","));
    else params.delete("stack");
    params.delete("page");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const toggleStack = (stack: string) => {
    const next = selectedStacks.includes(stack)
      ? selectedStacks.filter((s) => s !== stack)
      : [...selectedStacks, stack];
    updateFilters(next);
    if (!selectedStacks.includes(stack)) {
      setIsOpen(false);
      setQuery("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt &&
      opt.name &&
      opt.name.toLowerCase().includes(query.toLowerCase()) &&
      !selectedStacks.includes(opt.name),
  );

  return (
    <div className="space-y-3" ref={containerRef}>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
        Tech Stack
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {/* tags click remove */}
        {selectedStacks.map((stack) => (
          <button
            key={stack}
            onClick={() => toggleStack(stack)}
            className="flex items-center bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group"
          >
            {stack}
            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 font-bold">
              -
            </span>
          </button>
        ))}

        {/* trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border border-dashed cursor-pointer transition-all active:scale-90 ${
              isOpen
                ? "border-blue-500 bg-blue-50 text-blue-500 rotate-45"
                : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="text-xl leading-none">+</span>
          </button>

          {/* options menu */}
          {isOpen && (
            <div className="absolute left-0 top-11 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-slate-50">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search technologies..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.name}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 rounded-xl transition-colors text-slate-600 hover:text-blue-600 group"
                      onClick={() => toggleStack(opt.name)}
                    >
                      <span>{opt.name}</span>
                      <span className="text-[10px] text-slate-400 group-hover:text-blue-400 font-mono">
                        {opt.count}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    {query ? "No tech found" : "Loading stacks..."}
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
