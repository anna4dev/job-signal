"use client";

interface Option<T> {
  label: string;
  value: T;
}

interface ChipMultiSelectProps<T extends string> {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}

/**
 * Multi-select chip group. Selected chips show a ✓ checkmark to distinguish
 * them visually from single-select controls (SegmentedControl).
 */
export default function ChipMultiSelect<T extends string>({
  options,
  selected,
  onToggle,
}: ChipMultiSelectProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              active
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {active && (
              <svg
                className="w-3 h-3 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
