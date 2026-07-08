import type { UnifiedSignals } from "@/types/profile";

// Versioned key + custom event mirror explicit_profile_v1 / job_bookmarks so
// cross-tab sync and coercion-on-read behave consistently across the app.
export const UNIFIED_SIGNALS_KEY = "unified_signals_v1";
export const UNIFIED_SIGNALS_EVENT = "unified-signals-change";

// Structural gate for a persisted UnifiedSignals payload.
//
// This value is ALWAYS produced by computeUnifiedSignals (the sole owner of the
// pre-normalized `preferences` invariant). We therefore do not deep-coerce a
// stored payload — a partially-valid blob cannot be trusted to satisfy the
// sum(weight)=1 invariant. Any doubt returns null so the hook recomputes from
// the source keys (explicit_profile_v1 / job_bookmarks / saved_searches).
function isPersistedUnifiedSignals(p: unknown): p is UnifiedSignals {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  if (obj.version !== "1") return false;
  if (typeof obj.updatedAt !== "number") return false;
  return (
    typeof obj.hardConstraints === "object" &&
    obj.hardConstraints !== null &&
    typeof obj.capabilities === "object" &&
    obj.capabilities !== null &&
    typeof obj.preferences === "object" &&
    obj.preferences !== null &&
    typeof obj.rejections === "object" &&
    obj.rejections !== null &&
    typeof obj.implicit === "object" &&
    obj.implicit !== null
  );
}

// Returns null when nothing is persisted yet OR the stored value fails the
// version/structure gate. Callers treat null as "not computed" and recompute.
export function readUnifiedSignals(): UnifiedSignals | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UNIFIED_SIGNALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPersistedUnifiedSignals(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Returns true on successful persistence; false when localStorage is
// unavailable (private mode / quota / SSR). Dispatches the change event only on
// success so subscribers never react to a write that did not land.
export function writeUnifiedSignals(signals: UnifiedSignals): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(UNIFIED_SIGNALS_KEY, JSON.stringify(signals));
    window.dispatchEvent(new Event(UNIFIED_SIGNALS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearUnifiedSignals(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(UNIFIED_SIGNALS_KEY);
    window.dispatchEvent(new Event(UNIFIED_SIGNALS_EVENT));
    return true;
  } catch {
    return false;
  }
}
