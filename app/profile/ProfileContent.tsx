"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useExplicitProfile } from "@/hooks/useExplicitProfile";
import Switch from "@/components/Switch";
import SegmentedControl from "@/components/SegmentedControl";
import ChipMultiSelect from "@/components/ChipMultiSelect";
import TagSelect from "@/components/TagSelect";
import Footer from "@/components/Footer";
import {
  WORK_MODE_OPTIONS,
  EMPLOYMENT_OPTIONS,
  LEVEL_OPTIONS,
  YEARS_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  FUNDING_OPTIONS,
  CURRENCY_OPTIONS,
} from "@/lib/profileOptions";
import type {
  ExplicitProfile,
  WorkMode,
  EmploymentType,
  Weighted,
  ID,
  Currency,
  LocationSpec,
  Preferences,
  Rejections,
} from "@/types/profile";
import type { JobLevel } from "@/types/job";

// ── Stable fetch helpers (module-level = stable reference, safe in useEffect deps) ──

function makeProfileFetch(type: string) {
  return (q: string): Promise<string[]> =>
    fetch(
      `/api/profile-suggestions?type=${type}&q=${encodeURIComponent(q)}`,
    )
      .then((r) => r.json())
      .catch(() => []);
}

const fetchSkills = makeProfileFetch("skills");
const fetchIndustries = makeProfileFetch("industries");
const fetchRoles = makeProfileFetch("roles");
const fetchLocations = makeProfileFetch("locations");

// ── Profile-specific layout primitives (not shared, intentionally local) ─────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-slate-700 mb-2">{children}</p>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        {title}
      </h2>
      {children}
    </div>
  );
}

function CollapsibleSection({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {title}
          </h2>
          {!open && badge && (
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-slate-100 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Weighted<ID> array helpers ────────────────────────────────────────────────

function toTags(items: Weighted<ID>[]): string[] {
  return items.map((i) => i.value);
}

function addTag(items: Weighted<ID>[], value: string): Weighted<ID>[] {
  if (items.some((i) => i.value.toLowerCase() === value.toLowerCase()))
    return items;
  return [...items, { value, weight: 1, source: "explicit" as const }];
}

function removeTag(items: Weighted<ID>[], value: string): Weighted<ID>[] {
  return items.filter((i) => i.value.toLowerCase() !== value.toLowerCase());
}

function toggleWeightedChip(
  items: Weighted<ID>[],
  value: string,
): Weighted<ID>[] {
  if (items.some((i) => i.value === value))
    return items.filter((i) => i.value !== value);
  return [...items, { value, weight: 1, source: "explicit" as const }];
}

function toSelectedIds(items: Weighted<ID>[]): string[] {
  return items.map((i) => i.value);
}

function prefItemCount(p: Preferences): number {
  return (
    p.roles.length +
    p.skills.length +
    p.industries.length +
    p.companySizes.length +
    p.fundingStages.length +
    (p.salary ? 1 : 0)
  );
}

function rejItemCount(r: Rejections): number {
  return (
    (r.soft.skills?.length ?? 0) +
    (r.hard.industries?.length ?? 0) +
    (r.hard.companyIds?.length ?? 0) +
    ((r.soft.noOncall ?? 0) > 0 ? 1 : 0)
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileContent() {
  const { profile, updateProfile, resetProfile } = useExplicitProfile();
  const router = useRouter();
  const [savedFlash, setSavedFlash] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Collapsible sections: open if existing data is detected after hydration
  const [showPreferences, setShowPreferences] = useState(false);
  const [showRejections, setShowRejections] = useState(false);

  useEffect(() => {
    if (prefItemCount(profile.preferences) > 0) setShowPreferences(true);
    if (rejItemCount(profile.rejections) > 0) setShowRejections(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Salary local state — committed on blur to avoid per-keystroke saves
  const [salaryMin, setSalaryMin] = useState(
    String(profile.preferences.salary?.min ?? ""),
  );
  const [salaryMax, setSalaryMax] = useState(
    String(profile.preferences.salary?.max ?? ""),
  );
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const salaryCurrency: Currency =
    profile.preferences.salary?.currency ?? "USD";

  useEffect(() => {
    setSalaryMin(String(profile.preferences.salary?.min ?? ""));
    setSalaryMax(String(profile.preferences.salary?.max ?? ""));
    setSalaryError(null);
  }, [profile.preferences.salary]);

  // ── Save helper ──────────────────────────────────────────────────────────

  const save = useCallback(
    (next: ExplicitProfile) => {
      updateProfile(next);
      clearTimeout(flashTimer.current);
      setSavedFlash(true);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
    },
    [updateProfile],
  );

  // ── Section patchers ──────────────────────────────────────────────────────

  function patchHC(patch: Partial<ExplicitProfile["hardConstraints"]>) {
    save({ ...profile, hardConstraints: { ...profile.hardConstraints, ...patch } });
  }

  function patchCap(patch: Partial<ExplicitProfile["capabilities"]>) {
    save({ ...profile, capabilities: { ...profile.capabilities, ...patch } });
  }

  function patchPref(patch: Partial<ExplicitProfile["preferences"]>) {
    save({ ...profile, preferences: { ...profile.preferences, ...patch } });
  }

  function patchRejHard(patch: Partial<ExplicitProfile["rejections"]["hard"]>) {
    save({
      ...profile,
      rejections: {
        ...profile.rejections,
        hard: { ...profile.rejections.hard, ...patch },
      },
    });
  }

  function patchRejSoft(patch: Partial<ExplicitProfile["rejections"]["soft"]>) {
    save({
      ...profile,
      rejections: {
        ...profile.rejections,
        soft: { ...profile.rejections.soft, ...patch },
      },
    });
  }

  // ── Location ──────────────────────────────────────────────────────────────

  const locationTags = profile.hardConstraints.locations.allow.map((l) => l.id);

  function addLocation(value: string) {
    const spec: LocationSpec = { scope: "country", id: value };
    patchHC({ locations: { allow: [...profile.hardConstraints.locations.allow, spec] } });
  }

  function removeLocation(id: string) {
    patchHC({
      locations: {
        allow: profile.hardConstraints.locations.allow.filter((l) => l.id !== id),
      },
    });
  }

  // ── Salary ────────────────────────────────────────────────────────────────

  function validateSalary(min: string, max: string): string | null {
    const n = min ? Number(min) : undefined;
    const x = max ? Number(max) : undefined;
    if (n !== undefined && (isNaN(n) || n < 0)) return "Min must be a positive number";
    if (x !== undefined && (isNaN(x) || x < 0)) return "Max must be a positive number";
    if (n !== undefined && x !== undefined && x < n) return "Max must be ≥ min";
    return null;
  }

  function commitSalary(min: string, max: string, currency: Currency) {
    const err = validateSalary(min, max);
    setSalaryError(err);
    if (err) return;
    const parsedMin = min ? Number(min) : undefined;
    const parsedMax = max ? Number(max) : undefined;
    if (parsedMin !== undefined || parsedMax !== undefined) {
      patchPref({ salary: { min: parsedMin, max: parsedMax, currency, weight: 1 } });
    } else {
      patchPref({ salary: undefined });
    }
  }

  // ── Summary badges ────────────────────────────────────────────────────────

  const prefCount = prefItemCount(profile.preferences);
  const rejCount = rejItemCount(profile.rejections);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <span className="text-base font-semibold text-slate-900 absolute left-1/2 -translate-x-1/2">
            My Profile
          </span>

          <div className="flex items-center gap-3">
            {savedFlash && (
              <span className="text-[11px] font-medium text-emerald-600 animate-in fade-in duration-150">
                Saved
              </span>
            )}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-sm font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Reset profile?</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              All profile data will be cleared from this device. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { resetProfile(); setShowResetConfirm(false); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">

        {/* ── 1. Constraints (always open) ── */}
        <SectionCard title="Constraints">
          <div>
            <FieldLabel>Work mode</FieldLabel>
            <ChipMultiSelect
              options={WORK_MODE_OPTIONS}
              selected={profile.hardConstraints.work.modes}
              onToggle={(mode: WorkMode) => {
                const modes = profile.hardConstraints.work.modes;
                patchHC({
                  work: {
                    ...profile.hardConstraints.work,
                    modes: modes.includes(mode)
                      ? modes.filter((m) => m !== mode)
                      : [...modes, mode],
                  },
                });
              }}
            />
          </div>

          <div>
            <FieldLabel>Visa sponsorship</FieldLabel>
            <Switch
              checked={profile.hardConstraints.visa.required}
              onChange={(v) => patchHC({ visa: { required: v } })}
              label="I need visa sponsorship"
            />
          </div>

          <div>
            <FieldLabel>Locations I can work in</FieldLabel>
            <TagSelect
              tags={locationTags}
              onAdd={addLocation}
              onRemove={removeLocation}
              placeholder="Search country (e.g. United States, Germany)"
              fetchSuggestions={fetchLocations}
            />
          </div>

          <div>
            <FieldLabel>Employment type</FieldLabel>
            <ChipMultiSelect
              options={EMPLOYMENT_OPTIONS}
              selected={profile.hardConstraints.employmentTypes}
              onToggle={(type: EmploymentType) => {
                const types = profile.hardConstraints.employmentTypes;
                patchHC({
                  employmentTypes: types.includes(type)
                    ? types.filter((t) => t !== type)
                    : [...types, type],
                });
              }}
            />
          </div>
        </SectionCard>

        {/* ── 2. Background (always open) ── */}
        <SectionCard title="Background">
          <div>
            <FieldLabel>My skills</FieldLabel>
            <TagSelect
              tags={toTags(profile.capabilities.skills)}
              onAdd={(v) => patchCap({ skills: addTag(profile.capabilities.skills, v) })}
              onRemove={(v) => patchCap({ skills: removeTag(profile.capabilities.skills, v) })}
              placeholder="Search or add a skill (e.g. Python, React, AWS)"
              fetchSuggestions={fetchSkills}
            />
          </div>

          <div>
            <FieldLabel>Years of experience</FieldLabel>
            <SegmentedControl
              options={YEARS_OPTIONS}
              selected={
                YEARS_OPTIONS.find(
                  (o) => o.value === profile.capabilities.yearsOfExperience,
                )?.value ?? null
              }
              onSelect={(v) => patchCap({ yearsOfExperience: v as number })}
            />
          </div>

          <div>
            <FieldLabel>Seniority level</FieldLabel>
            <SegmentedControl
              options={LEVEL_OPTIONS}
              selected={profile.capabilities.seniorityLevel}
              onSelect={(v) => patchCap({ seniorityLevel: v as JobLevel })}
            />
          </div>

          <div>
            <FieldLabel>Industry experience (optional)</FieldLabel>
            <TagSelect
              tags={profile.capabilities.domains ?? []}
              onAdd={(v) =>
                patchCap({ domains: [...(profile.capabilities.domains ?? []), v] })
              }
              onRemove={(v) =>
                patchCap({
                  domains: (profile.capabilities.domains ?? []).filter(
                    (d) => d.toLowerCase() !== v.toLowerCase(),
                  ),
                })
              }
              placeholder="Search or add industry (e.g. Fintech, Healthcare)"
              fetchSuggestions={fetchIndustries}
            />
          </div>
        </SectionCard>

        {/* ── 3. Preferences (collapsible) ── */}
        <CollapsibleSection
          title="Preferences"
          badge={prefCount > 0 ? `${prefCount} set` : undefined}
          open={showPreferences}
          onToggle={() => setShowPreferences((v) => !v)}
        >
          <div>
            <FieldLabel>Target roles</FieldLabel>
            <TagSelect
              tags={toTags(profile.preferences.roles)}
              onAdd={(v) => patchPref({ roles: addTag(profile.preferences.roles, v) })}
              onRemove={(v) => patchPref({ roles: removeTag(profile.preferences.roles, v) })}
              placeholder="Search or add a role (e.g. Backend Engineer, Staff SWE)"
              fetchSuggestions={fetchRoles}
            />
          </div>

          <div>
            <FieldLabel>Tech I want to use</FieldLabel>
            <TagSelect
              tags={toTags(profile.preferences.skills)}
              onAdd={(v) => patchPref({ skills: addTag(profile.preferences.skills, v) })}
              onRemove={(v) => patchPref({ skills: removeTag(profile.preferences.skills, v) })}
              placeholder="Search or add tech (e.g. Go, Kubernetes, Rust)"
              fetchSuggestions={fetchSkills}
            />
          </div>

          <div>
            <FieldLabel>Preferred industries</FieldLabel>
            <TagSelect
              tags={toTags(profile.preferences.industries)}
              onAdd={(v) =>
                patchPref({ industries: addTag(profile.preferences.industries, v) })
              }
              onRemove={(v) =>
                patchPref({ industries: removeTag(profile.preferences.industries, v) })
              }
              placeholder="Search or add industry (e.g. SaaS, Developer Tools)"
              fetchSuggestions={fetchIndustries}
            />
          </div>

          <div>
            <FieldLabel>Company size</FieldLabel>
            <ChipMultiSelect
              options={COMPANY_SIZE_OPTIONS}
              selected={toSelectedIds(profile.preferences.companySizes)}
              onToggle={(v) =>
                patchPref({
                  companySizes: toggleWeightedChip(profile.preferences.companySizes, v),
                })
              }
            />
          </div>

          <div>
            <FieldLabel>Funding stage</FieldLabel>
            <ChipMultiSelect
              options={FUNDING_OPTIONS}
              selected={toSelectedIds(profile.preferences.fundingStages)}
              onToggle={(v) =>
                patchPref({
                  fundingStages: toggleWeightedChip(profile.preferences.fundingStages, v),
                })
              }
            />
          </div>

          <div>
            <FieldLabel>Salary range</FieldLabel>
            <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
              <select
                value={salaryCurrency}
                onChange={(e) => commitSalary(salaryMin, salaryMax, e.target.value as Currency)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 cursor-pointer shrink-0"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => { setSalaryMin(e.target.value); setSalaryError(null); }}
                  onBlur={() => commitSalary(salaryMin, salaryMax, salaryCurrency)}
                  placeholder="Min (e.g. 120000)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 placeholder:text-slate-400"
                />
              </div>
              <span className="text-slate-400 text-sm self-center shrink-0">–</span>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => { setSalaryMax(e.target.value); setSalaryError(null); }}
                  onBlur={() => commitSalary(salaryMin, salaryMax, salaryCurrency)}
                  placeholder="Max (optional)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 placeholder:text-slate-400"
                />
              </div>
            </div>
            {salaryError && (
              <p className="mt-1.5 text-xs text-rose-600">{salaryError}</p>
            )}
          </div>
        </CollapsibleSection>

        {/* ── 4. No Thanks (collapsible) ── */}
        <CollapsibleSection
          title="No thanks"
          badge={rejCount > 0 ? `${rejCount} set` : undefined}
          open={showRejections}
          onToggle={() => setShowRejections((v) => !v)}
        >
          <div>
            <FieldLabel>No on-call</FieldLabel>
            <Switch
              checked={(profile.rejections.soft.noOncall ?? 0) > 0}
              onChange={(v) => patchRejSoft({ noOncall: v ? 1 : 0 })}
              label="I don't want on-call responsibilities"
            />
          </div>

          <div>
            <FieldLabel>Tech I don&apos;t want to use</FieldLabel>
            <TagSelect
              tags={toTags(profile.rejections.soft.skills ?? [])}
              onAdd={(v) =>
                patchRejSoft({ skills: addTag(profile.rejections.soft.skills ?? [], v) })
              }
              onRemove={(v) =>
                patchRejSoft({ skills: removeTag(profile.rejections.soft.skills ?? [], v) })
              }
              placeholder="Search or add tech to avoid (e.g. PHP, COBOL)"
              fetchSuggestions={fetchSkills}
            />
          </div>

          <div>
            <FieldLabel>Industries to avoid</FieldLabel>
            <TagSelect
              tags={profile.rejections.hard.industries ?? []}
              onAdd={(v) =>
                patchRejHard({
                  industries: [...(profile.rejections.hard.industries ?? []), v],
                })
              }
              onRemove={(v) =>
                patchRejHard({
                  industries: (profile.rejections.hard.industries ?? []).filter(
                    (i) => i.toLowerCase() !== v.toLowerCase(),
                  ),
                })
              }
              placeholder="Search or add industry to avoid (e.g. Gambling)"
              fetchSuggestions={fetchIndustries}
            />
          </div>

          <div>
            <FieldLabel>Companies to avoid</FieldLabel>
            <TagSelect
              tags={profile.rejections.hard.companyIds ?? []}
              onAdd={(v) =>
                patchRejHard({
                  companyIds: [...(profile.rejections.hard.companyIds ?? []), v],
                })
              }
              onRemove={(v) =>
                patchRejHard({
                  companyIds: (profile.rejections.hard.companyIds ?? []).filter(
                    (c) => c.toLowerCase() !== v.toLowerCase(),
                  ),
                })
              }
              placeholder="Add company name to avoid"
            />
          </div>
        </CollapsibleSection>

        <p className="text-center text-xs text-slate-400 py-2">
          All data is stored locally on this device. No account required.
        </p>

        <Footer />
      </main>
    </div>
  );
}
