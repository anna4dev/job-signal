"use client";

import { BookmarkItem, BookmarkStatus } from "@/types/job";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "job_bookmarks";
const EVENT_KEY = "bookmark-change";

const VALID_STATUSES: BookmarkStatus[] = [
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

const EMPTY_CACHE: BookmarkItem[] = [];

let cache: BookmarkItem[] = EMPTY_CACHE;
let cacheRaw: string | null = null;

function deserialize(raw: string | null): BookmarkItem[] {
  if (!raw) return EMPTY_CACHE;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CACHE;
    return parsed.reduce<BookmarkItem[]>((acc, item) => {
      if (typeof item !== "object" || item === null) return acc;
      const i = item as Record<string, unknown>;
      if (typeof i.job_id !== "string") return acc;

      const entry: BookmarkItem = {
        job_id: i.job_id,
        created_at: typeof i.created_at === "number" ? i.created_at : Date.now(),
      };

      // Preserve status only when it was previously written by an explicit user action.
      // Old records without status stay as-is; UI is responsible for fallback display.
      if (
        typeof i.status === "string" &&
        VALID_STATUSES.includes(i.status as BookmarkStatus)
      ) {
        entry.status = i.status as BookmarkStatus;
        if (typeof i.status_updated_at === "number") {
          entry.status_updated_at = i.status_updated_at;
        }
      }

      acc.push(entry);
      return acc;
    }, []);
  } catch {
    return EMPTY_CACHE;
  }
}

function readFromStorage(): BookmarkItem[] {
  if (typeof window === "undefined") return EMPTY_CACHE;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cacheRaw) return cache;
    cache = deserialize(raw);
    cacheRaw = raw;
    return cache;
  } catch {
    cache = EMPTY_CACHE;
    cacheRaw = raw;
    return cache;
  }
}

function subscribe(callback: () => void) {
  const handler = () => {
    cacheRaw = null; // invalidate cache so next read re-parses
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT_KEY, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT_KEY, handler);
  };
}

function writeToStorage(next: BookmarkItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const serialized = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, serialized);
    cacheRaw = serialized;
    cache = next;
    window.dispatchEvent(new Event(EVENT_KEY));
    return true;
  } catch {
    return false;
  }
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    readFromStorage,
    () => EMPTY_CACHE,
  );

  const toggleBookmark = (jobId: string) => {
    const current = readFromStorage();
    const exists = current.some((item) => item.job_id === jobId);
    // New bookmarks intentionally have no status field.
    // Status is written only when the user explicitly picks one.
    const next = exists
      ? current.filter((item) => item.job_id !== jobId)
      : [{ job_id: jobId, created_at: Date.now() }, ...current];
    writeToStorage(next);
  };

  // Last-write-wins: only writes when now >= existing status_updated_at,
  // preventing cross-tab/cross-component state regression.
  const setBookmarkStatus = (jobId: string, status: BookmarkStatus) => {
    const current = readFromStorage();
    const now = Date.now();
    let didChange = false;
    const next = current.map((item) => {
      if (item.job_id !== jobId) return item;
      if (
        item.status_updated_at !== undefined &&
        now < item.status_updated_at
      ) {
        return item;
      }
      didChange = true;
      return { ...item, status, status_updated_at: now };
    });
    if (didChange) writeToStorage(next);
  };

  const clearAll = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    cacheRaw = null;
    cache = EMPTY_CACHE;
    window.dispatchEvent(new Event(EVENT_KEY));
  };

  return { bookmarks, toggleBookmark, setBookmarkStatus, clearAll };
}
