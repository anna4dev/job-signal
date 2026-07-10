/** Minimal job + company fields for bookmark-derived implicit signals (Phase 2.3). */
export type BookmarkJobSignalContext = {
  job_id: string;
  role_title: string;
  tech_stack: string[];
  industry: string | null;
  size: string | null;
  funding_stage: string | null;
};
