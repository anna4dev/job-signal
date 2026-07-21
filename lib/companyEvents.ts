import { getOrCreateAnonymousId } from "@/lib/anonymousId";

export type CompanyEventType =
  | "page_view"
  | "job_click"
  | "bookmark_add"
  | "bookmark_remove"
  | "apply_click"
  | "peer_click"
  | "trust_flag"
  | "revisit"
  | "long_horizon_view";

type CompanyEventBase = {
  company_id: string;
  /** 0-based position in a list (jobs or peers), when applicable. */
  position?: number | null;
  /** Peer company id for `peer_click`. */
  related_company_id?: string | null;
};

/** Page-scoped events without a required job_id. */
export type CompanyPageScopedEvent = CompanyEventBase & {
  event_type:
    | "page_view"
    | "revisit"
    | "long_horizon_view"
    | "trust_flag"
    | "peer_click";
  job_id?: string | null;
};

/** Job-scoped events require a non-empty job_id at compile time. */
export type CompanyJobScopedEvent = CompanyEventBase & {
  event_type: "job_click" | "bookmark_add" | "bookmark_remove" | "apply_click";
  job_id: string;
};

export type CompanyEventPayload = CompanyPageScopedEvent | CompanyJobScopedEvent;

/**
 * Fire-and-forget company-page observability events (Phase B/C).
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

const REVISIT_KEY_PREFIX = "job_signal_company_last_view_v1:";

/**
 * Record last company page view locally and return whether this visit is a
 * revisit (previous view older than ~24h). Used for Phase C exit metrics.
 */
export function rememberCompanyVisit(companyId: string): {
  isRevisit: boolean;
} {
  if (typeof window === "undefined") return { isRevisit: false };
  const key = `${REVISIT_KEY_PREFIX}${companyId}`;
  try {
    const prev = localStorage.getItem(key);
    const now = Date.now();
    localStorage.setItem(key, String(now));
    if (!prev) return { isRevisit: false };
    const prevMs = Number(prev);
    if (!Number.isFinite(prevMs)) return { isRevisit: false };
    return { isRevisit: now - prevMs >= 24 * 60 * 60 * 1000 };
  } catch {
    return { isRevisit: false };
  }
}
