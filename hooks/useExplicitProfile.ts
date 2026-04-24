"use client";

import { useSyncExternalStore } from "react";
import {
  readExplicitProfile,
  writeExplicitProfile,
  clearExplicitProfile,
  defaultExplicitProfile,
  PROFILE_EVENT,
} from "@/lib/profile";
import type { ExplicitProfile } from "@/types/profile";

// Module-level cache mirrors the useBookmarks pattern.
// Invalidated on every storage write/event; re-parsed only when raw string changes.
let cache: ExplicitProfile | null = null;
let cacheRaw: string | null = null;

// Stable server snapshot — same object reference every call to avoid React infinite loop.
// useSyncExternalStore requires getServerSnapshot to return a cached value.
const SERVER_SNAPSHOT: ExplicitProfile = defaultExplicitProfile();

function readFromStorage(): ExplicitProfile {
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
    cacheRaw = null; // invalidate so next read re-parses
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(PROFILE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(PROFILE_EVENT, handler);
  };
}

export function useExplicitProfile() {
  const profile = useSyncExternalStore(
    subscribe,
    readFromStorage,
    () => SERVER_SNAPSHOT,
  );

  function updateProfile(next: ExplicitProfile) {
    cache = next;
    cacheRaw = null; // force re-read on next subscription tick
    writeExplicitProfile(next);
  }

  function resetProfile() {
    cache = null;
    cacheRaw = null;
    clearExplicitProfile();
  }

  return { profile, updateProfile, resetProfile };
}
