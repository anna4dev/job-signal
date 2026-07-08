"use client";

import { useEffect, useMemo } from "react";
import { useExplicitProfile } from "@/hooks/useExplicitProfile";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { computeUnifiedSignals } from "@/lib/signals";
import { writeUnifiedSignals } from "@/lib/unifiedSignalsStorage";
import type { UnifiedSignals } from "@/types/profile";

// Phase 2.2: UnifiedSignals is DERIVED, not user-editable. It is recomputed from
// the three source keys (explicit_profile_v1 / job_bookmarks / saved_searches)
// and persisted to unified_signals_v1 as a cache for cross-tab reads and the
// Phase 3 fit engine.
//
// Subscriptions are reused from the source hooks (each already backs a
// useSyncExternalStore on its own event), so this hook does not re-implement
// storage plumbing. Recompute happens only when a source reference actually
// changes; writing the derived value does NOT feed back into the sources, so
// there is no recompute loop.
//
// computeUnifiedSignals owns the sum(weight)=1 invariant — this hook must never
// mutate `preferences` or call normalizeWeights.
export function useUnifiedSignals(): UnifiedSignals {
  const { profile } = useExplicitProfile();
  const { bookmarks } = useBookmarks();
  const { savedSearches } = useSavedSearches();

  const signals = useMemo(
    () => computeUnifiedSignals(profile, bookmarks, savedSearches),
    [profile, bookmarks, savedSearches],
  );

  useEffect(() => {
    // Persist the derived snapshot; failure (private mode / quota) is
    // non-fatal — callers still receive the in-memory `signals`.
    writeUnifiedSignals(signals);
  }, [signals]);

  return signals;
}
