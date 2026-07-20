import { cache } from "react";
import { loadCompanyAggregates } from "@/lib/companies";
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

/** Normalize industry/funding labels for case/whitespace-insensitive lane match. */
function laneKey(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

/**
 * Pick same-lane peers from the TTL-cached company aggregate snapshot.
 * Prefer shared industry, then funding_stage. Avoids per-request
 * LOWER(TRIM(...)) SQL scans on company_structured.
 *
 * Longer-term: job-seeker may persist indexed industry_key/funding_key columns
 * (see README Company Index Snapshot / peer-lane backlog).
 */
export async function listCompanyPeers(
  companyId: string,
  industry: string | null,
  fundingStage: string | null,
): Promise<{ peers: CompanyPeerSummary[]; laneLabel: string }> {
  const industryKey = laneKey(industry);
  const fundingKey = laneKey(fundingStage);

  if (!industryKey && !fundingKey) {
    return {
      peers: [],
      laneLabel: "No industry or funding stage on file — peers unavailable",
    };
  }

  const aggs = await loadCompanyAggregates();
  const scored = aggs
    .filter((row) => row.company_id !== companyId)
    .map((row) => {
      const peerIndustry = laneKey(row.industry);
      const peerFunding = laneKey(row.funding_stage);
      const sameIndustry = !!industryKey && peerIndustry === industryKey;
      const sameFunding = !!fundingKey && peerFunding === fundingKey;
      if (!sameIndustry && !sameFunding) return null;
      const lane: CompanyPeerSummary["lane"] =
        sameIndustry && sameFunding
          ? "mixed"
          : sameIndustry
            ? "industry"
            : "funding_stage";
      const last = row.last_post_at;
      return {
        peer: {
          company_id: row.company_id,
          company_name: row.company_name,
          industry: row.industry,
          size: row.size,
          funding_stage: row.funding_stage,
          job_count: row.job_count,
          last_post_at: last
            ? new Date(last).toISOString().slice(0, 10)
            : null,
          lane,
        } satisfies CompanyPeerSummary,
        industryRank: sameIndustry ? 0 : 1,
        jobCount: row.job_count,
        lastMs: last ? new Date(last).getTime() : 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => {
      if (a.industryRank !== b.industryRank) {
        return a.industryRank - b.industryRank;
      }
      if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
      return b.lastMs - a.lastMs;
    });

  const peers = scored.slice(0, PEER_LIMIT).map((x) => x.peer);

  const laneLabel = industryKey
    ? fundingKey
      ? `Same industry (${industry}), preferring similar funding (${fundingStage})`
      : `Same industry (${industry})`
    : `Same funding stage (${fundingStage})`;

  return { peers, laneLabel };
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
