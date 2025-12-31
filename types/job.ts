// 类型定义文件
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
  // jobs_structured 字段
  job_id: string;
  company_id: string;
  role_title: string;
  level: JobLevel;
  jd_url: string | null;
  location_city: string | null;
  location_country: string | null;
  location_remote: number; // SQLite 中布尔值通常存为 0/1
  location_visa_supported: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_median: number | null;
  confidence: ConfidenceLevel;

  // 从 company_structured 联表查询出的字段
  company_name: string;
  industry: string | null;
  tech_stack: string; // SQLite 存为 JSON 字符串
  size: string | null;
  funding_stage: string | null;
  fetched_at: string;
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

// 补充后的完整详情接口
export interface JobFullDetail extends JobWithCompany {
  responsibilities: string; // JSON string
  required_skills: string; // JSON string
  risk_flags: string; // JSON string
  risk_mitigation: string; // JSON string
  engineering_signals: string; // JSON string
  recent_news: string; // JSON string
  source_links: string; // JSON string {"website": "...", "linkedin": "..."}
  company_description: string;
}
