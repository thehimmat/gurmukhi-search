'use client';

import { SearchFilters } from '@/lib/supabase';

type Props = {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  raags: string[];
  writers: string[];
};

export default function FilterPanel({ filters, onChange, raags, writers }: Props) {
  function set(key: keyof SearchFilters, value: string | number | undefined) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-[#7a6045] hover:text-[#5c3d1e] select-none list-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        Filters
        {Object.values(filters).some(v => v != null) && (
          <span className="ml-1 text-xs bg-[#8b5e3c] text-[#fdf6ec] rounded-full px-1.5">
            {Object.values(filters).filter(v => v != null).length}
          </span>
        )}
      </summary>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Raag filter */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">Raag</span>
          <select
            value={filters.raag ?? ''}
            onChange={e => set('raag', e.target.value)}
            className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f]"
          >
            <option value="">All raags</option>
            {raags.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        {/* Writer filter */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">Writer</span>
          <select
            value={filters.writer ?? ''}
            onChange={e => set('writer', e.target.value)}
            className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f]"
          >
            <option value="">All writers</option>
            {writers.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>

        {/* Ang range */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">Ang from</span>
          <input
            type="number"
            min={1} max={1430}
            value={filters.angMin ?? ''}
            onChange={e => set('angMin', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="1"
            className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">Ang to</span>
          <input
            type="number"
            min={1} max={1430}
            value={filters.angMax ?? ''}
            onChange={e => set('angMax', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="1430"
            className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f]"
          />
        </label>
      </div>

      {Object.values(filters).some(v => v != null) && (
        <button
          onClick={() => onChange({})}
          className="mt-2 text-xs text-[#8b5e3c] hover:underline"
        >
          Clear all filters
        </button>
      )}
    </details>
  );
}
