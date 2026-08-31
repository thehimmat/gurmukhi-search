'use client';

import { useEffect, useRef, useState } from 'react';

export type Option = {
  value: string;
  label: string;
  hint?: string;   // shown right-aligned, e.g. a line count
  group?: string;  // options sharing a group render under one heading
};

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel: string; // shown when nothing is selected, e.g. "All writers"
};

// A dropdown that takes several values at once. Native <select multiple> needs
// ctrl-click to combine options and shows a scroll box that never collapses, so
// this is a button + checkbox list instead.
export default function MultiSelect({ label, options, selected, onChange, allLabel }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape, the way a native dropdown does.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  }

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  // Preserve the order the options arrive in; only insert a heading when the
  // group changes, so an ungrouped list renders as a plain flat list.
  let lastGroup: string | undefined;

  return (
    <div className="flex flex-col gap-1 relative" ref={boxRef}>
      <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{summary}</span>
        <span className="text-xs text-[#7a6045]">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 min-w-full max-w-[18rem] max-h-72 overflow-y-auto rounded border border-[#c8b89a] bg-[#fdf6ec] shadow-lg p-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left text-xs text-[#8b5e3c] hover:underline px-2 py-1"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
          {options.length === 0 && (
            <p className="px-2 py-1 text-xs text-[#7a6045] italic">No options</p>
          )}
          {options.map((o) => {
            const heading = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return (
              <div key={o.value}>
                {heading && (
                  <p className="px-2 pt-2 pb-0.5 text-[0.65rem] uppercase tracking-wide text-[#7a6045] font-medium">
                    {heading}
                  </p>
                )}
                <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#f3e6d2] cursor-pointer text-sm text-[#3d2b1f]">
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    className="accent-[#8b5e3c]"
                  />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-[#7a6045] tabular-nums">{o.hint}</span>}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
