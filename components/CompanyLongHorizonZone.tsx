"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackCompanyEvents } from "@/lib/companyEvents";
import type { CompanyLongHorizon } from "@/types/company";

/** Format an optional coverage share. */
function pct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

/**
 * Long-Horizon Zone — trajectory, signal consistency, same-lane peers,
 * and lightweight trust feedback (Phase C). No apply/do-not-apply verdict.
 */
export default function CompanyLongHorizonZone({
  companyId,
  longHorizon,
}: {
  companyId: string;
  longHorizon: CompanyLongHorizon;
}) {
  const [trustSent, setTrustSent] = useState(false);
  const { trajectory, consistency, peers, peerLaneLabel, disclaimer } =
    longHorizon;
  const maxJobs = Math.max(1, ...trajectory.map((t) => t.jobCount));

  useEffect(() => {
    trackCompanyEvents([
      { company_id: companyId, event_type: "long_horizon_view" },
    ]);
  }, [companyId]);

  function handlePeerClick(peerId: string, position: number) {
    trackCompanyEvents([
      {
        company_id: companyId,
        event_type: "peer_click",
        related_company_id: peerId,
        position,
      },
    ]);
  }

  function handleTrustFlag() {
    if (trustSent) return;
    trackCompanyEvents([
      {
        company_id: companyId,
        event_type: "trust_flag",
        position: 0,
      },
    ]);
    setTrustSent(true);
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Long Horizon</h2>
      <p className="text-sm text-slate-500 mb-6">{disclaimer}</p>

      <div>
        <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-3">
          Hiring trajectory
        </p>
        {trajectory.length === 0 ? (
          <p className="text-sm text-slate-400">No monthly history yet.</p>
        ) : (
          <ul className="space-y-2">
            {trajectory.map((m) => (
              <li key={m.month} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 tabular-nums text-slate-500">
                  {m.month}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{
                      width: `${Math.round((m.jobCount / maxJobs) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-medium text-slate-800 tabular-nums">
                  {m.jobCount}
                </span>
                <span className="hidden sm:inline w-28 shrink-0 text-[11px] text-slate-400">
                  remote {pct(m.remoteShare)} · pay {pct(m.salaryCoverage)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-900">
            Signal consistency
          </p>
          <span className="text-sm font-semibold text-slate-800 tabular-nums">
            {consistency.score}/100
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="text-[11px] text-slate-400">Remote early → late</p>
            <p className="font-medium text-slate-800 mt-0.5">
              {pct(consistency.remoteEarly)} → {pct(consistency.remoteLate)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="text-[11px] text-slate-400">Salary early → late</p>
            <p className="font-medium text-slate-800 mt-0.5">
              {pct(consistency.salaryEarly)} → {pct(consistency.salaryLate)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="text-[11px] text-slate-400">Top level early → late</p>
            <p className="font-medium text-slate-800 mt-0.5">
              {consistency.topLevelEarly ?? "—"} →{" "}
              {consistency.topLevelLate ?? "—"}
            </p>
          </div>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
          {consistency.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs font-bold uppercase tracking-tight text-slate-900 mb-1">
          Same-lane peers
        </p>
        <p className="text-[11px] text-slate-400 mb-3">{peerLaneLabel}</p>
        {peers.length === 0 ? (
          <p className="text-sm text-slate-400">
            No peers matched industry or funding stage yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {peers.map((peer, index) => (
              <li key={peer.company_id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/companies/${encodeURIComponent(peer.company_id)}`}
                  onClick={() => handlePeerClick(peer.company_id, index)}
                  className="flex flex-wrap items-start justify-between gap-2 group"
                >
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">
                      {peer.company_name}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {[
                        peer.industry,
                        peer.funding_stage,
                        peer.size,
                        peer.lane === "industry"
                          ? "industry lane"
                          : peer.lane === "funding_stage"
                            ? "funding lane"
                            : "industry + funding",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="font-medium text-slate-800">
                      {peer.job_count} roles
                    </p>
                    {peer.last_post_at ? (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {peer.last_post_at}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Do these long-horizon signals feel trustworthy for this company?
        </p>
        <button
          type="button"
          onClick={handleTrustFlag}
          disabled={trustSent}
          className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline disabled:no-underline disabled:text-slate-400"
        >
          {trustSent ? "Thanks — flagged" : "Flag as not trustworthy"}
        </button>
      </div>
    </section>
  );
}
