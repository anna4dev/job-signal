"use client";

import { useEffect, useMemo, useState } from "react";
import { useExplicitProfile } from "@/hooks/useExplicitProfile";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { computeUnifiedSignals } from "@/lib/signals";
import { writeUnifiedSignals } from "@/lib/unifiedSignalsStorage";
import type { UnifiedSignals } from "@/types/profile";
import type { BookmarkJobSignalContext } from "@/types/signals";

// Phase 2.2+: UnifiedSignals is DERIVED, not user-editable. Phase 2.3 fetches
// bookmark job context server-side so implicit signals can use company fields.
//
// computeUnifiedSignals owns the sum(weight)=1 invariant — this hook must never
// mutate `preferences` or call normalizeWeights.
export function useUnifiedSignals(): UnifiedSignals {
  const { profile } = useExplicitProfile();
  const { bookmarks } = useBookmarks();
  const { savedSearches } = useSavedSearches();
  const [bookmarkJobContexts, setBookmarkJobContexts] = useState<
    BookmarkJobSignalContext[]
  >([]);

  const bookmarkIdsKey = useMemo(
    () =>
      bookmarks
        .map((b) => `${b.job_id}:${b.status ?? ""}`)
        .join("|"),
    [bookmarks],
  );

  useEffect(() => {
    if (bookmarks.length === 0) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

    void (async () => {
      try {
        const res = await fetch("/api/jobs/signal-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_ids: bookmarks.map((b) => b.job_id),
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setBookmarkJobContexts([]);
          return;
        }
        const data = (await res.json()) as {
          jobs?: BookmarkJobSignalContext[];
        };
        setBookmarkJobContexts(data.jobs ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBookmarkJobContexts([]);
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [bookmarkIdsKey, bookmarks]);

  const signals = useMemo(() => {
    const contexts = bookmarks.length === 0 ? [] : bookmarkJobContexts;
    return computeUnifiedSignals(
      profile,
      bookmarks,
      savedSearches,
      contexts,
    );
  }, [profile, bookmarks, savedSearches, bookmarkJobContexts]);

  useEffect(() => {
    writeUnifiedSignals(signals);
  }, [signals]);

  return signals;
}
