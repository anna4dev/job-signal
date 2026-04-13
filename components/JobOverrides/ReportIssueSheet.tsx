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

const ANONYMOUS_ID_KEY = "job_signal_anonymous_id_v1";

interface ReportIssueSheetProps {
  jobId: string;
  jobRawId: string;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
  baseVisaSupported: number | null;
  baseTechStack: string[];
  trigger: (open: () => void) => ReactNode; // 强制要求传入 trigger
}

export default function ReportIssueSheet({
  jobId,
  jobRawId,
  baseSalaryMin,
  baseSalaryMax,
  baseVisaSupported,
  baseTechStack,
  trigger,
}: ReportIssueSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<"salary" | "visa" | "tech">("salary");

  const [salaryMode, setSalaryMode] = useState<SalaryMode>("not_mentioned");
  const [salaryMin, setSalaryMin] = useState<number | null>(null);
  const [salaryMax, setSalaryMax] = useState<number | null>(null);
  const [visaMode, setVisaMode] = useState<VisaMode>("not_mentioned");
  const [techStackSelected, setTechStackSelected] = useState<string[]>([]);

  const baseJob: BaseJobForOverrides = useMemo(() => ({
    job_id: jobId,
    salary_min: baseSalaryMin,
    salary_max: baseSalaryMax,
    location_visa_supported: baseVisaSupported,
    tech_stack: baseTechStack,
  }), [jobId, baseSalaryMin, baseSalaryMax, baseVisaSupported, baseTechStack]);

  // --- 逻辑与状态同步 (1:1 还原) ---
  useEffect(() => {
    if (!isOpen) return;
    const recompute = () => {
      const overrides = getJobOverridesFromLocalStorage();
      const current = overrides[jobId];

      if (current?.salary?.type === "overwrite") {
        setSalaryMode("range_incorrect");
        setSalaryMin(current.salary.value.min);
        setSalaryMax(current.salary.value.max);
      } else {
        setSalaryMode("not_mentioned");
        setSalaryMin(null);
        setSalaryMax(null);
      }

      if (current?.visa_support?.type === "overwrite") {
        const vv = current.visa_support.value;
        if (vv === null) setVisaMode("not_mentioned");
        else if (vv === true) setVisaMode("supported");
        else setVisaMode("not_supported");
      } else {
        setVisaMode("not_mentioned");
      }

      const effective = mergeJobWithOverrides(baseJob, current);
      setTechStackSelected(effective.tech_stack);
    };

    recompute();
  }, [isOpen, jobId, baseJob]);

  const onSubmit = async () => {
    const overrides = getJobOverridesFromLocalStorage();
    const current = overrides[jobId] || {};
    const nextForJob: Overrides[string] = { ...current };

    // Explicitly preserve "not mentioned" as a nullable overwrite.
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
    const add = techStackSelected.filter(t => !baseSet.has(t));
    const remove = baseTechStack.filter(t => !techStackSelected.includes(t));
    
    if (add.length > 0 || remove.length > 0) {
      nextForJob.tech_stack = { add, remove };
    } else {
      delete nextForJob.tech_stack;
    }

    overrides[jobId] = nextForJob;
    setJobOverridesToLocalStorage(overrides);
    window.dispatchEvent(new CustomEvent(JOB_OVERRIDES_EVENT, { detail: { jobId } }));

    // 异步上报 (Backend)
    const anonId = localStorage.getItem(ANONYMOUS_ID_KEY) || crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonId);

    const report = (
      field: string,
      type: "overwrite" | "add" | "remove",
      val: unknown,
      orig: unknown,
    ) => {
      fetch("/api/job-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId, job_raw_id: jobRawId, anonymous_id: anonId,
          field, correction_type: type, corrected_value: JSON.stringify(val), original_value: JSON.stringify(orig)
        })
      }).catch(() => {});
    };

    if (nextForJob.salary) {
      report("salary", "overwrite", nextForJob.salary.value, {
        min: baseSalaryMin,
        max: baseSalaryMax,
      });
    }
    if (nextForJob.visa_support) {
      report(
        "visa_support",
        "overwrite",
        nextForJob.visa_support.value,
        mapVisaSupportedValue(baseVisaSupported),
      );
    }
    if (nextForJob.tech_stack) {
       if (nextForJob.tech_stack.add.length) report("tech_stack", "add", nextForJob.tech_stack.add, []);
       if (nextForJob.tech_stack.remove.length) report("tech_stack", "remove", nextForJob.tech_stack.remove, []);
    }

    setIsOpen(false);
  };

  return (
    <>
      {/* 仅通过 trigger 暴露入口 */}
      {trigger(() => setIsOpen(true))}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsOpen(false)} />

          {/* 抽屉容器：UI 1:1 还原 */}
          <div className="relative w-full bg-white rounded-t-3xl border border-slate-200 shadow-lg animate-in slide-in-from-bottom duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Report Issue</h3>
                <p className="text-xs text-slate-500 mt-1">Make structured corrections and we will submit them.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-50 border border-slate-200 text-slate-400">✕</button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
              {/* Salary Section */}
              <div className="rounded-2xl border border-slate-200">
                <button onClick={() => setActiveField("salary")} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <span className="font-bold text-sm text-slate-900">Salary</span>
                  <span className="text-xs text-slate-500">{activeField === "salary" ? "−" : "+"}</span>
                </button>
                {activeField === "salary" && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <RadioOption label="Not mentioned" checked={salaryMode === "not_mentioned"} onChange={() => setSalaryMode("not_mentioned")} />
                      <RadioOption label="Range incorrect" checked={salaryMode === "range_incorrect"} onChange={() => setSalaryMode("range_incorrect")} />
                    </div>
                    {salaryMode === "range_incorrect" && (
                      <div className="grid grid-cols-2 gap-3">
                        <InputBox label="Min (USD)" value={salaryMin} onChange={setSalaryMin} />
                        <InputBox label="Max (USD)" value={salaryMax} onChange={setSalaryMax} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Visa Section */}
              <div className="rounded-2xl border border-slate-200">
                <button onClick={() => setActiveField("visa")} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <span className="font-bold text-sm text-slate-900">Visa Support</span>
                  <span className="text-xs text-slate-500">{activeField === "visa" ? "−" : "+"}</span>
                </button>
                {activeField === "visa" && (
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    <RadioOption label="Supported" checked={visaMode === "supported"} onChange={() => setVisaMode("supported")} />
                    <RadioOption label="Not Supported" checked={visaMode === "not_supported"} onChange={() => setVisaMode("not_supported")} />
                    <RadioOption label="Not mentioned" checked={visaMode === "not_mentioned"} onChange={() => setVisaMode("not_mentioned")} />
                  </div>
                )}
              </div>

              {/* Tech Stack Section */}
              <div className="rounded-2xl border border-slate-200">
                <button onClick={() => setActiveField("tech")} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <span className="font-bold text-sm text-slate-900">Tech Stack</span>
                  <span className="text-xs text-slate-500">{activeField === "tech" ? "−" : "+"}</span>
                </button>
                {activeField === "tech" && (
                  <div className="px-4 pb-4">
                    <StackFilter value={techStackSelected} onChange={setTechStackSelected} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsOpen(false)} className="flex-1 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={onSubmit} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700">Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 内部私有组件保持 UI 一致
function RadioOption({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="radio" className="w-4 h-4 border-slate-300 text-amber-600 focus:ring-amber-500" checked={checked} onChange={onChange} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function InputBox({ label, value, onChange }: { label: string, value: number | null, onChange: (v: number | null) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none" />
    </div>
  );
}