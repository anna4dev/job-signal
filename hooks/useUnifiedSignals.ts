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

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/jobs/signal-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_ids: bookmarks.map((b) => b.job_id),
          }),
        });
        if (!res.ok) {
          if (!cancelled) setBookmarkJobContexts([]);
          return;
        }
        const data = (await res.json()) as {
          jobs?: BookmarkJobSignalContext[];
        };
        if (!cancelled) setBookmarkJobContexts(data.jobs ?? []);
      } catch {
        if (!cancelled) setBookmarkJobContexts([]);
      }
    })();

    return () => {
      cancelled = true;
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
