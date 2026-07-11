import type { FactorKey, UnifiedSignals, Weight } from "@/types/profile";
import type { JobLevel } from "@/types/job";

/**
 * Minimal job shape for fit(). List rows can omit detail-only fields;
 * missing optional fields skip the related soft factors (never hard-fail).
 */
export type FitJobInput = {
  job_id: string;
  company_id: string;
  role_title: string;
  level: JobLevel;
  location_city: string | null;
  location_country: string | null;
  location_remote: number;
  location_timezone: string | null;
  location_visa_supported: number;
  salary_min: number | null;
  salary_max: number | null;
  industry: string | null;
  size: string | null;
  funding_stage: string | null;
  /** Parsed tech stack tags. */
  tech_stack: string[];
  /** From jobs_structured.required_skills when available. */
  required_skills?: string[];
  /** From jobs_structured.responsibilities when available (on-call soft reject). */
  responsibilities?: string[];
  /** From jobs_structured.work_style when available. */
  work_style?: string | null;
};

export type FactorContribution = {
  key: FactorKey;
  /** Match quality in [0, 1] for positive factors; penalty intensity in [0, 1] for soft rejects. */
  score: Weight;
  /** Relative weight used in the aggregate (0 when factor skipped). */
  weight: Weight;
  /** Signed contribution toward the 0..1 utility before scaling to fitScore. */
  contribution: number;
  detail?: string;
};

export type FitResult = {
  /** Integer 0..100. Hard-constraint failure always yields 0. */
  fitScore: number;
  hardFail: boolean;
  hardFailReasons: FactorKey[];
  /** Short human-readable tags for UI (Phase 3.2). */
  reasonTags: string[];
  factorBreakdown: FactorContribution[];
};

export type { UnifiedSignals };
