import type { CompanyEvidence } from "@/types/company";

function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

/**
 * Trend zone — 30/90-day momentum, role mix, job-derived stack, anomaly hints.
 */
export default function CompanyTrendZone({
  evidence,
}: {
  evidence: CompanyEvidence;
}) {
  const { momentum } = evidence;
  const maxBar = Math.max(
    momentum.jobs30d,
    momentum.jobsPrev30d,
    momentum.jobs90d,
    momentum.jobsPrev90d,
    1,
  );

  const bars: { label: string; value: number; hint: string }[] = [
    {
      label: "Last 30d",
      value: momentum.jobs30d,
      hint: `vs prior 30d: ${formatDelta(momentum.delta30d)}`,
    },
    {
      label: "Prior 30d",
      value: momentum.jobsPrev30d,
      hint: "day −60 … −30",
    },
    {
      label: "Last 90d",
      value: momentum.jobs90d,
      hint: `vs prior 90d: ${formatDelta(momentum.delta90d)}`,
    },
    {
      label: "Prior 90d",
      value: momentum.jobsPrev90d,
      hint: "day −180 … −90",
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Trend</h2>
      <p className="text-sm text-slate-500 mb-6">
        Hiring momentum and mix from structured HN posts — not a forecast.
      </p>

      <div>
        <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
          Posting momentum
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500">{bar.label}</span>
                <span className="text-sm font-semibold text-slate-900">
                  {bar.value}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-700"
                  style={{ width: `${Math.round((bar.value / maxBar) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">{bar.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {evidence.levelMix.length > 0 ? (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
            Role level mix
          </p>
          <div className="flex flex-wrap gap-2">
            {evidence.levelMix.map((item) => (
              <span
                key={item.level}
                className="px-3 py-1 bg-slate-50 text-slate-700 border border-slate-100 rounded-full text-xs font-semibold"
              >
                {item.level} · {item.count} ({item.share}%)
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {evidence.jobTechStack.length > 0 ? (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
            Tech stack from jobs
          </p>
          <div className="flex flex-wrap gap-x-1.5 gap-y-1.5">
            {evidence.jobTechStack.map((item) => (
              <span
                key={item.tech}
                className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100/60 rounded"
              >
                {item.tech}
                <span className="text-slate-400 ml-1">{item.count}</span>
              </span>
            ))}
          </div>
          {evidence.coverage.techStack != null ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Stack present on {evidence.coverage.techStack}% of jobs
            </p>
          ) : null}
        </div>
      ) : null}

      {evidence.hints.length > 0 ? (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
            Notes
          </p>
          <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
            {evidence.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
