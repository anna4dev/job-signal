"use client";

import { BookmarkItem } from "@/types/job";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "job_bookmarks";

const EMPTY_CACHE: BookmarkItem[] = [];

let cache: BookmarkItem[] = EMPTY_CACHE;
let cacheRaw: string | null = null;

function readFromStorage(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === cacheRaw) {
      return cache;
    }

    cacheRaw = raw;
    cache = raw ? JSON.parse(raw) : EMPTY_CACHE;

    return cache;
  } catch {
    return EMPTY_CACHE;
  }
}

function subscribe(callback: () => void) {
  const handler = () => {
    readFromStorage();
    callback();
  };

  window.addEventListener("storage", handler);
  window.addEventListener("bookmark-change", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("bookmark-change", handler);
  };
}

function getSnapshot(): BookmarkItem[] {
  return readFromStorage();
}

function getServerSnapshot(): BookmarkItem[] {
  return EMPTY_CACHE;
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggleBookmark = (jobId: string) => {
    const current = readFromStorage();
    const exists = current.some((item) => item.job_id === jobId);

    const next = exists
      ? current.filter((item) => item.job_id !== jobId)
      : [{ job_id: jobId, created_at: Date.now() }, ...current];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("bookmark-change"));
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("bookmark-change"));
  };

  return { bookmarks, toggleBookmark, clearAll };
}
