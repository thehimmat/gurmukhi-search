'use client';

import { useId } from 'react';
import { Scope } from '@/lib/letterset';

type Props = {
  value: Scope;
  onChange: (s: Scope) => void;
};

const OPTIONS: { id: Scope; label: string; desc: string }[] = [
  { id: 'word', label: 'Words', desc: 'Return matching dictionary words' },
  { id: 'line', label: 'Lines', desc: 'Return Gurbani lines that contain a match' },
];

// Word vs line scope for pattern-style searches.
export default function ScopeToggle({ value, onChange }: Props) {
  const labelId = useId();
  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-xs font-medium text-[#7a6045]">Show</span>
      <div role="radiogroup" aria-labelledby={labelId} className="inline-flex gap-1 rounded-lg bg-[#f0e4d0] p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            title={o.desc}
            onClick={() => onChange(o.id)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              value === o.id
                ? 'bg-[#8b5e3c] text-[#fdf6ec] shadow-sm'
                : 'text-[#5c3d1e] hover:bg-[#e0d0b8]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
