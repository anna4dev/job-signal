"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  readExplicitProfile,
  isProfileEmpty,
  PROFILE_EVENT,
} from "@/lib/profile";
import type { ExplicitProfile } from "@/types/profile";
import { defaultExplicitProfile } from "@/lib/profile";

let cache: ExplicitProfile | null = null;
let cacheRaw: string | null = null;

// Stable server snapshot — avoids useSyncExternalStore infinite loop.
const SERVER_SNAPSHOT: ExplicitProfile = defaultExplicitProfile();

function readSnapshot(): ExplicitProfile {
  if (typeof window === "undefined") return defaultExplicitProfile();
  try {
    const raw = localStorage.getItem("explicit_profile_v1");
    if (raw === cacheRaw && cache !== null) return cache;
    cache = readExplicitProfile();
    cacheRaw = raw;
    return cache;
  } catch {
    return defaultExplicitProfile();
  }
}

function subscribe(callback: () => void) {
  const handler = () => {
    cacheRaw = null;
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(PROFILE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(PROFILE_EVENT, handler);
  };
}

export default function ProfileEntry() {
  const profile = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const filled = !isProfileEmpty(profile);

  return (
    // Positioned directly above BookmarkEntry (bottom-24 + ~44px button + 8px gap ≈ bottom-36)
    <div className="fixed bottom-36 right-4 xl:right-30 z-50">
      <Link
        href="/profile"
        className="group flex items-center bg-slate-50 border border-slate-200 rounded-full shadow-lg hover:shadow-xl hover:border-slate-300 transition-all duration-300 ease-in-out active:scale-95 max-w-11 lg:hover:max-w-50 overflow-hidden"
      >
        <div className="max-w-0 opacity-0 lg:group-hover:max-w-44 lg:group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap">
          <span className="pl-4 pr-2 text-[12px] font-bold text-slate-600">
            {filled ? "My Profile" : "Set up Profile"}
          </span>
        </div>
        <div
          className={`p-2.5 rounded-full shadow-sm transition-colors shrink-0 ${
            filled
              ? "bg-slate-700 group-hover:bg-slate-800"
              : "bg-slate-400 group-hover:bg-slate-500"
          }`}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </Link>
    </div>
  );
}
