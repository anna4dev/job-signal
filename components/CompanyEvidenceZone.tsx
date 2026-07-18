import type { CompanyEvidence } from "@/types/company";

/** Format a 0–100 coverage share for display. */
function pct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

/** Format an ISO timestamp as YYYY-MM-DD. */
function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Evidence & Sources zone — sample size, window, coverage, sources (Phase B).
 */
export default function CompanyEvidenceZone({
  evidence,
}: {
  evidence: CompanyEvidence;
}) {
  const coverageRows: { label: string; value: number | null }[] = [
    { label: "Remote", value: evidence.coverage.remote },
    { label: "Visa", value: evidence.coverage.visa },
    { label: "Salary disclosed", value: evidence.coverage.salary },
    { label: "Level known", value: evidence.coverage.level },
    { label: "Tech stack on job", value: evidence.coverage.techStack },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Evidence & Sources
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Structured signals only — no external enrichment. Verify on the original
        HN thread and company career page.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Sample size</p>
          <p className="font-semibold text-slate-900 text-lg">
            {evidence.sampleSize}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Coverage months</p>
          <p className="font-semibold text-slate-900 text-lg">
            {evidence.postingMonthCount || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">First post</p>
          <p className="font-semibold text-slate-900 text-sm mt-1">
            {dateLabel(evidence.firstPostAt)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Latest post</p>
          <p className="font-semibold text-slate-900 text-sm mt-1">
            {dateLabel(evidence.lastPostAt)}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
          Field coverage
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {coverageRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
            >
              <p className="text-[11px] text-slate-400">{row.label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {pct(row.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Window:</span>{" "}
          {evidence.windowLabel}
        </p>
        <p>
          <span className="font-medium text-slate-800">Sources:</span>{" "}
          {evidence.sources.join(" · ")}
        </p>
      </div>
    </section>
  );
}
