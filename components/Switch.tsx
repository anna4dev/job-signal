"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/**
 * iOS-style Switch for boolean toggles.
 * Use for binary on/off fields (e.g. visa sponsorship, no on-call).
 * For mutually exclusive options, use SegmentedControl.
 * For multi-select, use ChipMultiSelect.
 */
export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-1 cursor-pointer group"
    >
      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
      <div
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-slate-900" : "bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
