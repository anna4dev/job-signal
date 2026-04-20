"use client";

import { useSyncExternalStore } from "react";
import { filterSnapshotKey } from "@/lib/savedSearch";

export interface SavedSearchItem {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
  useCount: number;
  lastUsedAt: string;
}

const STORAGE_KEY = "saved_searches";
const EVENT_KEY = "search-change";
const EMPTY_CACHE: SavedSearchItem[] = [];

let cache: SavedSearchItem[] = EMPTY_CACHE;
let cacheRaw: string | null = null;

function readFromStorage(): SavedSearchItem[] {
  if (typeof window === "undefined") return EMPTY_CACHE;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cacheRaw) return cache;
    const parsed = raw ? (JSON.parse(raw) as Partial<SavedSearchItem>[]) : [];
    cache = (Array.isArray(parsed) ? parsed : []).map((item) => ({
      id: String(item.id || Date.now()),
      name: String(item.name || "My Search"),
      filters: item.filters && typeof item.filters === "object" ? item.filters : {},
      createdAt: String(item.createdAt || new Date().toISOString()),
      useCount: typeof item.useCount === "number" ? item.useCount : 0,
      lastUsedAt: String(item.lastUsedAt || item.createdAt || new Date().toISOString()),
    }));
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
    readFromStorage();
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT_KEY, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT_KEY, handler);
  };
}

// localStorage.setItem can throw synchronously (quota, private mode, disabled
// storage). Wrap writes so callers never see an exception bubble up.
function writeToStorage(next: SavedSearchItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_KEY));
    return true;
  } catch {
    return false;
  }
}

export function useSavedSearches() {
  const savedSearches = useSyncExternalStore(
    subscribe,
    readFromStorage,
    () => EMPTY_CACHE,
  );

  const saveSearch = (
    name: string,
    filters: Record<string, string>,
  ): {
    ok: boolean;
    reason?: "duplicate" | "max_reached" | "storage_error";
  } => {
    const current = readFromStorage();
    const newSnapshot = filterSnapshotKey(filters);
    const isDuplicate = current.some(
      (item) => filterSnapshotKey(item.filters) === newSnapshot,
    );
    if (isDuplicate) return { ok: false, reason: "duplicate" };
    if (current.length >= 5) return { ok: false, reason: "max_reached" };

    const newEntry: SavedSearchItem = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString(),
      useCount: 0,
      lastUsedAt: new Date().toISOString(),
    };
    const next = [newEntry, ...current];
    if (!writeToStorage(next)) return { ok: false, reason: "storage_error" };
    return { ok: true };
  };

  const removeSearch = (id: string) => {
    const current = readFromStorage();
    const next = current.filter((item) => item.id !== id);
    writeToStorage(next);
  };

  const touchSearch = (id: string) => {
    const current = readFromStorage();
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            useCount: (item.useCount || 0) + 1,
            lastUsedAt: new Date().toISOString(),
          }
        : item,
    );
    writeToStorage(next);
  };

  return { savedSearches, saveSearch, removeSearch, touchSearch };
}
