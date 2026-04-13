export type ConfidenceLevel = "high" | "medium" | "low";
export type JobLevel =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "unknown";

export interface JobWithCompany {
  // data from jobs_structured
  job_id: string;
  company_id: string;
  role_title: string;
  level: JobLevel;
  jd_url: string | null;
  location_city: string | null;
  location_country: string | null;
  location_remote: number;
  location_timezone: string | null;
  location_visa_supported: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_median: number | null;
  confidence: ConfidenceLevel;
  post_at: string;

  // data from company_structured
  company_name: string;
  industry: string | null;
  tech_stack: string;
  size: string | null;
  funding_stage: string | null;
}

export interface RiskFlag {
  flag: string;
  severity: "high" | "medium" | "low";
}

export interface RecentNews {
  title: string;
  url: string;
  date: string;
}

// job details
export interface JobFullDetail extends JobWithCompany {
  job_raw_id: string;
  raw_text: string;
  original_text: string;
  responsibilities: string; // JSON string
  required_skills: string; // JSON string
  risk_flags: string; // JSON string
  risk_mitigation: string; // JSON string
  engineering_signals: string; // JSON string
  recent_news: string; // JSON string
  source_links: string; // JSON string {"website": "...", "linkedin": "..."}
  company_description: string;
}

export interface JobWithBookmark extends JobWithCompany {
  bookmarked_at: number | null;
}

export interface BookmarkItem {
  job_id: string;
  created_at: number;
}

export interface RawPostData {
  job_id: string;
  job_raw_id: string;
  salary_min: number | null;
  salary_max: number | null;
  location_visa_supported: number | null;
  raw_text: string;
}

export interface JobRawPostSectionProps {
  jobData: RawPostData;
  baseTechStack: string[];
}