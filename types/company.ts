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
