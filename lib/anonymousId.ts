export const ANONYMOUS_ID_KEY = "job_signal_anonymous_id_v1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stable anonymous client id for corrections / fit events (local-first).
 * Returns "" if storage is unavailable (e.g. Safari private mode quota).
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing && UUID_RE.test(existing)) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}
