import { cache } from "react";
import { buildCompanyEvidenceFromRows } from "@/lib/companyAggregates";
import { loadCompanyJobAggregateRows } from "@/lib/companyJobRows";
import type { CompanyEvidence } from "@/types/company";

/**
 * Evidence aggregates for company detail Phase B zones (momentum, coverage,
 * level mix, job-derived stack). Reuses the same cached job-row fetch as
 * getCompanyQuickStats so company detail does not hit the DB twice.
 */
export const getCompanyEvidence = cache(async function getCompanyEvidence(
  companyId: string,
  companySource: string | null,
): Promise<CompanyEvidence> {
  const rows = await loadCompanyJobAggregateRows(companyId);
  return buildCompanyEvidenceFromRows(rows, companySource);
});
