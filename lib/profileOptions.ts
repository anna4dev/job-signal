import type { WorkMode, EmploymentType, Currency } from "@/types/profile";
import type { JobLevel } from "@/types/job";

export const WORK_MODE_OPTIONS: { label: string; value: WorkMode }[] = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];

export const EMPLOYMENT_OPTIONS: { label: string; value: EmploymentType }[] = [
  { label: "Full-time", value: "full-time" },
  { label: "Contract", value: "contract" },
  { label: "Part-time", value: "part-time" },
];

/** Single-select → SegmentedControl */
export const LEVEL_OPTIONS: { label: string; value: JobLevel }[] = [
  { label: "Intern", value: "intern" },
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Staff", value: "staff" },
  { label: "Principal", value: "principal" },
];

/** Single-select → SegmentedControl */
export const YEARS_OPTIONS: { label: string; value: number }[] = [
  { label: "< 1 yr", value: 0 },
  { label: "1–2", value: 1 },
  { label: "3–5", value: 3 },
  { label: "5–8", value: 6 },
  { label: "8+", value: 8 },
];

/** Values must align with company_structured.size DB enum */
export const COMPANY_SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: "1–10", value: "1-10 people" },
  { label: "11–50", value: "11-50 people" },
  { label: "51–200", value: "51-200 people" },
  { label: "201–500", value: "201-500 people" },
  { label: "501–1000", value: "501-1000 people" },
  { label: "1000+", value: "1000+ people" },
];

/** Values must align with company_structured.funding_stage DB enum */
export const FUNDING_OPTIONS: { label: string; value: string }[] = [
  { label: "Bootstrapped", value: "Bootstrapped" },
  { label: "Seed", value: "Seed" },
  { label: "Series A", value: "Series A" },
  { label: "Series B", value: "Series B" },
  { label: "Series C", value: "Series C" },
  { label: "Series D+", value: "Series D+" },
  { label: "Profitable", value: "Profitable" },
  { label: "Public", value: "Public" },
];

export const CURRENCY_OPTIONS: Currency[] = ["USD", "EUR", "KRW", "CNY"];
