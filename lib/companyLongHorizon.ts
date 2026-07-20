import { cache } from "react";
import { db } from "@/lib/db";
import { asNullableString, asNumber, asString } from "@/lib/dbCoerce";
import { loadCompanyJobAggregateRows } from "@/lib/companyJobRows";
import {
  buildCompanySignalConsistency,
  buildCompanyTrajectory,
} from "@/lib/companyLongHorizonMath";
import type {
  CompanyLongHorizon,
  CompanyPeerSummary,
} from "@/types/company";

const PEER_LIMIT = 5;
const PEER_CANDIDATE_LIMIT = 24;

/**
 * Pick same-lane peers: prefer shared industry, then funding_stage.
 * Does not emit apply/do-not-apply judgments — comparison context only.
 */
export async function listCompanyPeers(
  companyId: string,
  industry: string | null,
  fundingStage: string | null,
): Promise<{ peers: CompanyPeerSummary[]; laneLabel: string }> {
  const industryKey = (industry || "").trim();
  const fundingKey = (fundingStage || "").trim();

  if (!industryKey && !fundingKey) {
    return {
      peers: [],
      laneLabel: "No industry or funding stage on file — peers unavailable",
    };
  }

  const result = await db.execute({
    sql: `
      SELECT
        c.company_id,
        c.company_name,
        c.industry,
        c.size,
        c.funding_stage,
        COUNT(j.job_id) AS job_count,
        MAX(j.post_at) AS last_post_at
      FROM company_structured c
      INNER JOIN jobs_structured j ON j.company_id = c.company_id
      WHERE c.company_id != ?
        AND (
          (? != '' AND c.industry IS NOT NULL AND LOWER(TRIM(c.industry)) = LOWER(?))
          OR (? != '' AND c.funding_stage IS NOT NULL AND LOWER(TRIM(c.funding_stage)) = LOWER(?))
        )
      GROUP BY c.company_id
      HAVING COUNT(j.job_id) > 2
      ORDER BY
        CASE
          WHEN ? != '' AND c.industry IS NOT NULL AND LOWER(TRIM(c.industry)) = LOWER(?) THEN 0
          ELSE 1
        END,
        COUNT(j.job_id) DESC,
        MAX(j.post_at) DESC
      LIMIT ?
    `,
    args: [
      companyId,
      industryKey,
      industryKey,
      fundingKey,
      fundingKey,
      industryKey,
      industryKey,
      PEER_CANDIDATE_LIMIT,
    ],
  });

  const peers: CompanyPeerSummary[] = result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const peerIndustry = asNullableString(r.industry);
    const peerFunding = asNullableString(r.funding_stage);
    const sameIndustry =
      !!industryKey &&
      (peerIndustry || "").trim().toLowerCase() === industryKey.toLowerCase();
    const sameFunding =
      !!fundingKey &&
      (peerFunding || "").trim().toLowerCase() === fundingKey.toLowerCase();
    const lane: CompanyPeerSummary["lane"] =
      sameIndustry && sameFunding
        ? "mixed"
        : sameIndustry
          ? "industry"
          : "funding_stage";
    const last = asNullableString(r.last_post_at);
    return {
      company_id: asString(r.company_id),
      company_name: asString(r.company_name),
      industry: peerIndustry,
      size: asNullableString(r.size),
      funding_stage: peerFunding,
      job_count: asNumber(r.job_count),
      last_post_at: last
        ? new Date(last).toISOString().slice(0, 10)
        : null,
      lane,
    };
  });

  const laneLabel = industryKey
    ? fundingKey
      ? `Same industry (${industryKey}), preferring similar funding (${fundingKey})`
      : `Same industry (${industryKey})`
    : `Same funding stage (${fundingKey})`;

  return { peers: peers.slice(0, PEER_LIMIT), laneLabel };
}

/**
 * Long-horizon aggregates for Phase C: trajectory, consistency, peers.
 * Reuses the cached per-company job-row fetch from Phase B.
 */
export const getCompanyLongHorizon = cache(async function getCompanyLongHorizon(
  companyId: string,
  industry: string | null,
  fundingStage: string | null,
): Promise<CompanyLongHorizon> {
  const rows = await loadCompanyJobAggregateRows(companyId);
  const trajectory = buildCompanyTrajectory(rows);
  const consistency = buildCompanySignalConsistency(rows);
  const { peers, laneLabel } = await listCompanyPeers(
    companyId,
    industry,
    fundingStage,
  );

  return {
    trajectory,
    consistency,
    peers,
    peerLaneLabel: laneLabel,
    disclaimer:
      "Long-horizon view uses structured HN Who's Hiring history only. It is context for comparison — not an apply / do-not-apply recommendation.",
  };
});
