export const ANONYMOUS_ID_KEY = "job_signal_anonymous_id_v1";

/** Stable anonymous client id for corrections / fit events (local-first). */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(ANONYMOUS_ID_KEY, id);
  return id;
}
