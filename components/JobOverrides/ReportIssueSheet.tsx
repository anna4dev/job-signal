"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import StackFilter from "@/components/StackFilter";
import { JOB_OVERRIDES_EVENT } from "@/hooks/useJobEffectiveJob";
import {
  BaseJobForOverrides,
  getJobOverridesFromLocalStorage,
  mapVisaSupportedValue,
  mergeJobWithOverrides,
  Overrides,
  setJobOverridesToLocalStorage,
} from "@/lib/jobOverrides";

type SalaryMode = "not_mentioned" | "range_incorrect";
type VisaMode = "not_mentioned" | "supported" | "not_supported";

type FieldBaseline = {
  salaryMode: SalaryMode;
  salaryMin: number | null;
  salaryMax: number | null;
  visaMode: VisaMode;
  techStack: string[];
};

const ANONYMOUS_ID_KEY = "job_signal_anonymous_id_v1";

/** Order-insensitive multiset equality (StackFilter may reorder tags). */
function sameTechStack(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const t of a) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const t of b) {
    const n = counts.get(t);
    if (!n) return false;
    if (n === 1) counts.delete(t);
    else counts.set(t, n - 1);
  }
  return counts.size === 0;
}

interface ReportIssueSheetProps {
  jobId: string;
  jobRawId: string;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
  baseVisaSupported: number | null;
  baseTechStack: string[];
  /** When true, trigger is rendered disabled and sheet cannot open. */
  disabled?: boolean;
  trigger: (open: () => void, disabled: boolean) => ReactNode;
}

export default function ReportIssueSheet({
  jobId,
  jobRawId,
  baseSalaryMin,
  baseSalaryMax,
  baseVisaSupported,
  baseTechStack,
  disabled = false,
  trigger,
}: ReportIssueSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<"salary" | "visa" | "tech">(
    "salary",
  );
  // Sheet-local selection only; Submit writes override + reports.
  const [notAJobSelected, setNotAJobSelected] = useState(false);
  // Snapshot when sheet opens — Submit stays disabled until a real edit or not-a-job.
  const [baseline, setBaseline] = useState<FieldBaseline | null>(null);

  const [salaryMode, setSalaryMode] = useState<SalaryMode>("not_mentioned");
  const [salaryMin, setSalaryMin] = useState<number | null>(null);
  const [salaryMax, setSalaryMax] = useState<number | null>(null);
  const [visaMode, setVisaMode] = useState<VisaMode>("not_mentioned");
  const [techStackSelected, setTechStackSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const baseJob: BaseJobForOverrides = useMemo(
    () => ({
      job_id: jobId,
      salary_min: baseSalaryMin,
      salary_max: baseSalaryMax,
      location_visa_supported: baseVisaSupported,
      tech_stack: baseTechStack,
    }),
    [jobId, baseSalaryMin, baseSalaryMax, baseVisaSupported, baseTechStack],
  );

  useEffect(() => {
    if (!isOpen) return;
    const recompute = () => {
      const overrides = getJobOverridesFromLocalStorage();
      const current = overrides[jobId];
      // Mirror what the page shows (base + local overrides), not a blank form.
      // Otherwise "Not mentioned" is already baseline and cannot be submitted as a fix.
      const effective = mergeJobWithOverrides(baseJob, current);

      let nextSalaryMode: SalaryMode = "not_mentioned";
      let nextSalaryMin: number | null = null;
      let nextSalaryMax: number | null = null;
      if (effective.salary_min !== null || effective.salary_max !== null) {
        nextSalaryMode = "range_incorrect";
        nextSalaryMin = effective.salary_min;
        nextSalaryMax = effective.salary_max;
      }

      let nextVisaMode: VisaMode = "not_mentioned";
      if (effective.location_visa_supported === true) {
        nextVisaMode = "supported";
      } else if (effective.location_visa_supported === false) {
        nextVisaMode = "not_supported";
      }

      const nextTech = effective.tech_stack;

      setSalaryMode(nextSalaryMode);
      setSalaryMin(nextSalaryMin);
      setSalaryMax(nextSalaryMax);
      setVisaMode(nextVisaMode);
      setTechStackSelected(nextTech);
      setBaseline({
        salaryMode: nextSalaryMode,
        salaryMin: nextSalaryMin,
        salaryMax: nextSalaryMax,
        visaMode: nextVisaMode,
        techStack: nextTech,
      });
    };

    recompute();
  }, [isOpen, jobId, baseJob]);

  const hasFieldChanges =
    baseline !== null &&
    (salaryMode !== baseline.salaryMode ||
      salaryMin !== baseline.salaryMin ||
      salaryMax !== baseline.salaryMax ||
      visaMode !== baseline.visaMode ||
      !sameTechStack(techStackSelected, baseline.techStack));

  const canSubmit = (notAJobSelected || hasFieldChanges) && !submitting;

  const postCorrection = async (
    field: string,
    type: "overwrite" | "add" | "remove",
    val: unknown,
    orig: unknown,
  ): Promise<"ok" | "rate_limited" | "failed"> => {
    const anonId =
      localStorage.getItem(ANONYMOUS_ID_KEY) || crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonId);

    try {
      const res = await fetch("/api/job-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          job_raw_id: jobRawId,
          anonymous_id: anonId,
          field,
          correction_type: type,
          corrected_value: JSON.stringify(val),
          original_value: JSON.stringify(orig),
        }),
      });
      if (res.status === 429) return "rate_limited";
      return res.ok ? "ok" : "failed";
    } catch {
      return "failed";
    }
  };

  const handleSubmitFailure = (reason: "rate_limited" | "failed") => {
    setSubmitting(false);
    setSubmitError(
      reason === "rate_limited"
        ? "Too many reports for this job. Please try again later."
        : "Report failed. Please try again.",
    );
  };

  const openSheet = () => {
    if (disabled) return;
    setNotAJobSelected(false);
    setBaseline(null);
    setSubmitError(null);
    setSubmitting(false);
    setIsOpen(true);
  };

  const closeSheet = () => {
    setNotAJobSelected(false);
    setBaseline(null);
    setSubmitError(null);
    setSubmitting(false);
    setIsOpen(false);
  };

  const submitNotAJob = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const result = await postCorrection("is_job", "overwrite", false, true);
    if (result !== "ok") {
      handleSubmitFailure(result);
      return;
    }

    const overrides = getJobOverridesFromLocalStorage();
    const current = overrides[jobId] || {};
    overrides[jobId] = {
      ...current,
      is_job: { type: "overwrite", value: false },
    };
    setJobOverridesToLocalStorage(overrides);
    window.dispatchEvent(
      new CustomEvent(JOB_OVERRIDES_EVENT, { detail: { jobId } }),
    );
    closeSheet();
  };

  const submitFieldCorrections = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const nextForJob: Overrides[string] = {
      ...(getJobOverridesFromLocalStorage()[jobId] || {}),
    };

    nextForJob.salary =
      salaryMode === "range_incorrect"
        ? {
            type: "overwrite",
            value: { min: salaryMin, max: salaryMax },
          }
        : {
            type: "overwrite",
            value: { min: null, max: null },
          };

    nextForJob.visa_support = {
      type: "overwrite",
      value:
        visaMode === "supported"
          ? true
          : visaMode === "not_supported"
            ? false
            : null,
    };

    const baseSet = new Set(baseTechStack);
    const add = techStackSelected.filter((t) => !baseSet.has(t));
    const remove = baseTechStack.filter((t) => !techStackSelected.includes(t));

    if (add.length > 0 || remove.length > 0) {
      nextForJob.tech_stack = { add, remove };
    } else {
      delete nextForJob.tech_stack;
    }

    const reports: Promise<"ok" | "rate_limited" | "failed">[] = [];
    if (nextForJob.salary) {
      reports.push(
        postCorrection("salary", "overwrite", nextForJob.salary.value, {
          min: baseSalaryMin,
          max: baseSalaryMax,
        }),
      );
    }
    if (nextForJob.visa_support) {
      reports.push(
        postCorrection(
          "visa_support",
          "overwrite",
          nextForJob.visa_support.value,
          mapVisaSupportedValue(baseVisaSupported),
        ),
      );
    }
    if (nextForJob.tech_stack) {
      if (nextForJob.tech_stack.add.length) {
        reports.push(
          postCorrection("tech_stack", "add", nextForJob.tech_stack.add, []),
        );
      }
      if (nextForJob.tech_stack.remove.length) {
        reports.push(
          postCorrection(
            "tech_stack",
            "remove",
            nextForJob.tech_stack.remove,
            [],
          ),
        );
      }
    }

    const results = await Promise.all(reports);
    if (results.length === 0) {
      handleSubmitFailure("failed");
      return;
    }
    if (results.some((r) => r === "rate_limited")) {
      handleSubmitFailure("rate_limited");
      return;
    }
    if (results.some((r) => r !== "ok")) {
      handleSubmitFailure("failed");
      return;
    }

    const overrides = getJobOverridesFromLocalStorage();
    overrides[jobId] = nextForJob;
    setJobOverridesToLocalStorage(overrides);
    window.dispatchEvent(
      new CustomEvent(JOB_OVERRIDES_EVENT, { detail: { jobId } }),
    );
    closeSheet();
  };

  const onSubmit = () => {
    if (!canSubmit) return;
    if (notAJobSelected) void submitNotAJob();
    else void submitFieldCorrections();
  };

  return (
    <>
      {trigger(openSheet, disabled)}

      {isOpen && !disabled && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeSheet}
          />

          <div className="relative w-full bg-white rounded-t-3xl border border-slate-200 shadow-lg animate-in slide-in-from-bottom duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Report Issue
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Make structured corrections and we will submit them.
                </p>
              </div>
              <button
                onClick={closeSheet}
                className="w-9 h-9 rounded-xl hover:bg-slate-50 border border-slate-200 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
              {/* Top: whole-listing mode (toggle). Submit applies it. */}
              <button
                type="button"
                onClick={() => setNotAJobSelected((v) => !v)}
                className={`w-full px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                  notAJobSelected
                    ? "border-slate-400 bg-slate-100 ring-1 ring-slate-300"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block font-bold text-sm text-slate-900">
                  This is not a job posting
                </span>
                <span
                  className={`block text-xs mt-0.5 ${
                    notAJobSelected ? "text-slate-600" : "text-slate-500"
                  }`}
                >
                  {notAJobSelected
                    ? "Selected. Field corrections below are disabled. Tap Submit to report."
                    : "Report that this listing was misclassified as a job."}
                </span>
              </button>

              {/* Stay mounted when not-a-job is selected — dim + inert, no layout jump */}
              <div
                className={`space-y-4 transition-opacity ${
                  notAJobSelected ? "opacity-40 select-none" : ""
                }`}
                {...(notAJobSelected ? { inert: true as const } : {})}
              >
                <div className="rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveField("salary")}
                    className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-bold text-sm text-slate-900">
                      Salary
                    </span>
                    <span className="text-xs text-slate-500">
                      {activeField === "salary" ? "−" : "+"}
                    </span>
                  </button>
                  {activeField === "salary" && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex flex-col gap-2">
                        <RadioOption
                          label="Not mentioned"
                          checked={salaryMode === "not_mentioned"}
                          onChange={() => setSalaryMode("not_mentioned")}
                        />
                        <RadioOption
                          label="Range incorrect"
                          checked={salaryMode === "range_incorrect"}
                          onChange={() => setSalaryMode("range_incorrect")}
                        />
                      </div>
                      {salaryMode === "range_incorrect" && (
                        <div className="grid grid-cols-2 gap-3">
                          <InputBox
                            label="Min (USD)"
                            value={salaryMin}
                            onChange={setSalaryMin}
                          />
                          <InputBox
                            label="Max (USD)"
                            value={salaryMax}
                            onChange={setSalaryMax}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveField("visa")}
                    className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-bold text-sm text-slate-900">
                      Visa Support
                    </span>
                    <span className="text-xs text-slate-500">
                      {activeField === "visa" ? "−" : "+"}
                    </span>
                  </button>
                  {activeField === "visa" && (
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      <RadioOption
                        label="Supported"
                        checked={visaMode === "supported"}
                        onChange={() => setVisaMode("supported")}
                      />
                      <RadioOption
                        label="Not Supported"
                        checked={visaMode === "not_supported"}
                        onChange={() => setVisaMode("not_supported")}
                      />
                      <RadioOption
                        label="Not mentioned"
                        checked={visaMode === "not_mentioned"}
                        onChange={() => setVisaMode("not_mentioned")}
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveField("tech")}
                    className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-bold text-sm text-slate-900">
                      Tech Stack
                    </span>
                    <span className="text-xs text-slate-500">
                      {activeField === "tech" ? "−" : "+"}
                    </span>
                  </button>
                  {activeField === "tech" && (
                    <div className="px-4 pb-4">
                      <StackFilter
                        value={techStackSelected}
                        onChange={setTechStackSelected}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 space-y-3">
              {submitError ? (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {submitError}
                </p>
              ) : null}
              <div className="flex gap-3">
              <button
                onClick={closeSheet}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className={
                  canSubmit
                    ? "flex-1 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 cursor-pointer"
                    : "flex-1 px-4 py-2 text-sm font-bold text-slate-400 bg-slate-200 rounded-xl cursor-not-allowed"
                }
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RadioOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        className="w-4 h-4 border-slate-300 text-amber-600 focus:ring-amber-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function InputBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
        {label}
      </p>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
      />
    </div>
  );
}
