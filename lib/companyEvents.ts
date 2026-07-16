import { getOrCreateAnonymousId } from "@/lib/anonymousId";

export type CompanyEventType =
  | "page_view"
  | "job_click"
  | "bookmark_add"
  | "bookmark_remove"
  | "apply_click";

export type CompanyEventPayload = {
  company_id: string;
  /** Required except for `page_view`. */
  job_id?: string | null;
  event_type: CompanyEventType;
  /** 0-based position in the company jobs list (when applicable). */
  position?: number | null;
};

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
