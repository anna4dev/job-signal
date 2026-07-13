import { getOrCreateAnonymousId } from "@/lib/anonymousId";

export type FitEventType =
  | "impression"
  | "open"
  | "bookmark_add"
  | "bookmark_remove"
  | "sort_change";

export type FitEventPayload = {
  /** Required except for `sort_change`. */
  job_id?: string | null;
  event_type: FitEventType;
  fit_score?: number | null;
  hard_fail?: boolean;
  /**
   * List sort context, or for `sort_change` the transition `from->to`
   * (e.g. `newest->fit`).
   */
  sort_mode?: string | null;
  position?: number | null;
};

/**
 * Fire-and-forget fit observability events (Phase 3.3).
 * Does not affect scoring or ranking — monitoring only.
 */
export function trackFitEvents(events: FitEventPayload[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  const anonymous_id = getOrCreateAnonymousId();
  if (!anonymous_id) return;

  void fetch("/api/fit-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonymous_id, events }),
    keepalive: true,
  }).catch(() => {});
}
