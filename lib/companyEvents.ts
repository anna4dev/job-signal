import { getOrCreateAnonymousId } from "@/lib/anonymousId";

export type CompanyEventType =
  | "page_view"
  | "job_click"
  | "bookmark_add"
  | "bookmark_remove"
  | "apply_click";

type CompanyEventBase = {
  company_id: string;
  /** 0-based position in the company jobs list (when applicable). */
  position?: number | null;
};

/** Page view has no required job_id. */
export type CompanyPageViewEvent = CompanyEventBase & {
  event_type: "page_view";
  job_id?: string | null;
};

/** Job-scoped events require a non-empty job_id at compile time. */
export type CompanyJobScopedEvent = CompanyEventBase & {
  event_type: "job_click" | "bookmark_add" | "bookmark_remove" | "apply_click";
  job_id: string;
};

export type CompanyEventPayload = CompanyPageViewEvent | CompanyJobScopedEvent;

/**
 * Fire-and-forget company-page observability events (Phase B).
 * Monitoring only — does not affect ranking or signals.
 */
export function trackCompanyEvents(events: CompanyEventPayload[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  const anonymous_id = getOrCreateAnonymousId();
  if (!anonymous_id) return;

  void fetch("/api/company-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonymous_id, events }),
    keepalive: true,
  }).catch(() => {});
}
