export type CompanyListItem = {
  company_id: string;
  company_name: string;
  industry: string | null;
  size: string | null;
  funding_stage: string | null;
  job_count: number;
  last_post_at: string | null;
};

export type CompanyDetail = {
  company_id: string;
  company_name: string;
  company_description: string | null;
  industry: string | null;
  confidence: string | null;
  source: string | null;
  source_links: string | null;
  size: string | null;
  funding_stage: string | null;
  total_funding_usd: number | null;
  tech_stack: string | null;
  culture_keywords: string | null;
  enrichment_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CompanyJobSnapshot = {
  job_id: string;
  role_title: string;
  level: string;
  location_city: string | null;
  location_country: string | null;
  location_remote: number;
  location_visa_supported: number;
  salary_min: number | null;
  salary_max: number | null;
  post_at: string;
  tech_stack: string | null;
  jd_url: string | null;
};

/** Rolling hiring momentum over 30/90-day windows (Phase B). */
export type CompanyMomentum = {
  jobs30d: number;
  jobs90d: number;
  /** Posts in the prior 30d window (day −60 … −30). */
  jobsPrev30d: number;
  /** Posts in the prior 90d window (day −180 … −90). */
  jobsPrev90d: number;
  /** jobs30d − jobsPrev30d; null when both windows empty. */
  delta30d: number | null;
  /** jobs90d − jobsPrev90d; null when both windows empty. */
  delta90d: number | null;
};

/** Evidence-first decision signals for company detail (Phase B). */
export type CompanyEvidence = {
  sampleSize: number;
  windowLabel: string;
  firstPostAt: string | null;
  lastPostAt: string | null;
  postingMonthCount: number;
  sources: string[];
  coverage: {
    remote: number | null;
    visa: number | null;
    salary: number | null;
    /** Share of jobs with a non-empty parsed tech_stack. */
    techStack: number | null;
    /** Share of jobs with a known level (not `unknown`). */
    level: number | null;
  };
  levelMix: { level: string; count: number; share: number }[];
  /** Top technologies aggregated from job-level tech_stack. */
  jobTechStack: { tech: string; count: number }[];
  momentum: CompanyMomentum;
  hints: string[];
};

export type CompanyQuickStats = {
  jobCount: number;
  openRolesSample: number;
  remoteShare: number | null;
  visaShare: number | null;
  salaryCoverage: number | null;
  topLevels: { level: string; count: number }[];
  postingMonths: string[];
  firstPostAt: string | null;
  lastPostAt: string | null;
  indexable: boolean;
};

/** One month on the hiring trajectory timeline (Phase C). */
export type CompanyTrajectoryMonth = {
  month: string;
  jobCount: number;
  remoteShare: number | null;
  salaryCoverage: number | null;
  topLevel: string | null;
};

/** How stable key signals are across early vs late posting history. */
export type CompanySignalConsistency = {
  /** 0–100; higher = more stable across early/late halves. */
  score: number;
  remoteEarly: number | null;
  remoteLate: number | null;
  salaryEarly: number | null;
  salaryLate: number | null;
  visaEarly: number | null;
  visaLate: number | null;
  topLevelEarly: string | null;
  topLevelLate: string | null;
  notes: string[];
};

/** Same-lane peer company for comparison (Phase C). */
export type CompanyPeerSummary = {
  company_id: string;
  company_name: string;
  industry: string | null;
  size: string | null;
  funding_stage: string | null;
  job_count: number;
  last_post_at: string | null;
  /** Why this peer was selected (e.g. same industry). */
  lane: "industry" | "funding_stage" | "mixed";
};

/** Long-horizon context for company detail (Phase C). */
export type CompanyLongHorizon = {
  trajectory: CompanyTrajectoryMonth[];
  consistency: CompanySignalConsistency;
  peers: CompanyPeerSummary[];
  peerLaneLabel: string;
  disclaimer: string;
};
