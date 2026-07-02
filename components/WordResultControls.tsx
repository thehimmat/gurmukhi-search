'use client';

import { useRef } from 'react';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';
import { useKeyboardLayout, KeyboardLayoutSwitch } from './KeyboardLayoutSwitch';
import { WordSort, FilterMode } from '@/lib/letterset';

type Props = {
  sort: WordSort;
  onSortChange: (s: WordSort) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (m: FilterMode) => void;
};

const SORT_OPTIONS: { id: WordSort; label: string }[] = [
  { id: 'freq_desc', label: 'Most frequent' },
  { id: 'freq_asc', label: 'Least frequent' },
  { id: 'len_desc', label: 'Longest (by syllables)' },
  { id: 'len_asc', label: 'Shortest (by syllables)' },
];

// Ordering + in-result filter for word-scope Letter Set results.
export default function WordResultControls({
  sort,
  onSortChange,
  filter,
  onFilterChange,
  filterMode,
  onFilterModeChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { layout, choose } = useKeyboardLayout();
  const { onKeyDown, onPaste } = useGurmukhiInput({ value: filter, onChange: onFilterChange, layout });

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-[#ddd0be] bg-[#fdf9f3] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-[#5c3d1e]">
          Sort
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as WordSort)}
            className="rounded border border-[#c8b89a] bg-white px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>

        <div className="relative min-w-[10rem] flex-1">
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="filter these results…"
            className="w-full rounded-md border border-[#c8b89a] bg-white px-3 py-1.5 text-base
                       focus:outline-none focus:ring-2 focus:ring-[#8b5e3c]
                       placeholder:text-sm placeholder:text-[#a0896a]"
            style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
          />
          {filter && (
            <button
              onClick={() => onFilterChange('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-lg text-[#a0896a] hover:text-[#5c3d1e]"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5c3d1e]">
        <KeyboardLayoutSwitch layout={layout} onChange={(n) => { choose(n); inputRef.current?.focus(); }} />
        <span className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#7a6045]">Match</span>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="fmode" checked={filterMode === 'prefix'} onChange={() => onFilterModeChange('prefix')} />
            From start
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="fmode" checked={filterMode === 'substring'} onChange={() => onFilterModeChange('substring')} />
            Anywhere
          </label>
        </span>
      </div>
    </div>
  );
}
