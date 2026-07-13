import { getOrCreateAnonymousId } from "@/lib/anonymousId";

export type FitEventType =
  | "impression"
  | "open"
  | "bookmark_add"
  | "bookmark_remove";

export type FitEventPayload = {
  job_id: string;
  event_type: FitEventType;
  fit_score?: number | null;
  hard_fail?: boolean;
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
