import type { FactorKey } from "@/types/profile";

/**
 * Stable FactorKey → job/company field mapping for Phase 3 fit() and explainability.
 * Values are column names on joined job detail rows (jobs_structured + company_structured).
 * employment_type_constraint is omitted until jobs_structured exposes employment_type.
 */
export const FACTOR_FIELD_MAP = {
  visa_constraint: "location_visa_supported",
  work_mode_constraint: "work_style",
  location_constraint: "location_country",
  hard_rejection_industry: "industry",
  hard_rejection_company: "company_id",
  capability_skill_match: "required_skills",
  capability_level_match: "level",
  preference_role_match: "role_title",
  preference_skill_match: "tech_stack",
  preference_industry_match: "industry",
  preference_company_size_match: "size",
  preference_funding_stage_match: "funding_stage",
  preference_work_mode_match: "work_style",
  preference_salary_match: "salary_min",
  soft_rejection_oncall: "responsibilities",
  soft_rejection_skill: "tech_stack",
  soft_rejection_company_type: "size",
} as const satisfies Record<FactorKey, string>;

export type FactorJobField = (typeof FACTOR_FIELD_MAP)[FactorKey];

export function factorJobField(key: FactorKey): FactorJobField {
  return FACTOR_FIELD_MAP[key];
}
