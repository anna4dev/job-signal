"use client";

interface Option<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string | number> {
  options: Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}

/**
 * Segmented control for single-select fields (e.g. years of experience, seniority level).
 * Active segment gets white background + shadow; inactive segments are muted.
 * Scrollable horizontally on small screens.
 *
 * Use Switch for boolean fields, ChipMultiSelect for multi-select fields.
 */
export default function SegmentedControl<T extends string | number>({
  options,
  selected,
  onSelect,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className="flex p-1 bg-slate-100 rounded-xl gap-0.5 overflow-x-auto"
    >
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(opt.value)}
            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
