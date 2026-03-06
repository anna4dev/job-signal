"use client";

import { useSyncExternalStore } from "react";

export interface SavedSearchItem {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

const STORAGE_KEY = "saved_searches";
const EVENT_KEY = "search-change";
const EMPTY_CACHE: SavedSearchItem[] = [];

let cache: SavedSearchItem[] = EMPTY_CACHE;
let cacheRaw: string | null = null;

function readFromStorage(): SavedSearchItem[] {
  if (typeof window === "undefined") return EMPTY_CACHE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cacheRaw) return cache;
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
  window.addEventListener(EVENT_KEY, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT_KEY, handler);
  };
}

export const getNormalizedSnapshot = (filters: Record<string, string>) => {
  const cleanFilters = { ...filters };
  delete cleanFilters.page;
  const sortedKeys = Object.keys(cleanFilters).sort();
  const orderedObj = sortedKeys.reduce(
    (obj, key) => {
      obj[key] = cleanFilters[key];
      return obj;
    },
    {} as Record<string, string>,
  );

  return JSON.stringify(orderedObj);
};

export function useSavedSearches() {
  const savedSearches = useSyncExternalStore(
    subscribe,
    readFromStorage,
    () => EMPTY_CACHE,
  );

  const saveSearch = (name: string, filters: Record<string, string>) => {
    const current = readFromStorage();
    const newSnapshot = getNormalizedSnapshot(filters);
    const isDuplicate = current.some(
      (item) => getNormalizedSnapshot(item.filters) === newSnapshot,
    );
    if (isDuplicate) return;

    const newEntry: SavedSearchItem = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    const next = [newEntry, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_KEY));
  };

  const removeSearch = (id: string) => {
    const current = readFromStorage();
    const next = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("search-change"));
  };

  return { savedSearches, saveSearch, removeSearch };
}
