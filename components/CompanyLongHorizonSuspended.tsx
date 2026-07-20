import { Suspense } from "react";
import { getCompanyLongHorizon } from "@/lib/companyLongHorizon";
import CompanyLongHorizonZone from "@/components/CompanyLongHorizonZone";

/** Skeleton while long-horizon aggregates + peer query resolve. */
export function CompanyLongHorizonFallback() {
  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-6 w-40 bg-slate-100 rounded mb-4" />
      <div className="h-4 w-full max-w-xl bg-slate-100 rounded mb-6" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 rounded" />
        <div className="h-3 w-4/6 bg-slate-100 rounded" />
      </div>
    </section>
  );
}

/**
 * Async server island for Phase C Long-Horizon Zone. Isolated so Suspense
 * can stream it without blocking Hero / Quick Decision / Jobs.
 */
async function CompanyLongHorizonSection({
  companyId,
  industry,
  fundingStage,
}: {
  companyId: string;
  industry: string | null;
  fundingStage: string | null;
}) {
  const longHorizon = await getCompanyLongHorizon(
    companyId,
    industry,
    fundingStage,
  );
  return (
    <CompanyLongHorizonZone companyId={companyId} longHorizon={longHorizon} />
  );
}

/**
 * Suspense wrapper for the long-horizon section (failure/latency stays local).
 */
export default function CompanyLongHorizonSuspended({
  companyId,
  industry,
  fundingStage,
}: {
  companyId: string;
  industry: string | null;
  fundingStage: string | null;
}) {
  return (
    <Suspense fallback={<CompanyLongHorizonFallback />}>
      <CompanyLongHorizonSection
        companyId={companyId}
        industry={industry}
        fundingStage={fundingStage}
      />
    </Suspense>
  );
}
