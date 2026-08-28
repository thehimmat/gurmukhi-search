'use client';

import {
  SearchFilters,
  WriterFacet,
  RaagFacet,
  CorpusFacet,
  activeFilterCount,
} from '@/lib/supabase';
import MultiSelect, { Option } from './MultiSelect';

type Props = {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  raags: RaagFacet[];
  writers: WriterFacet[];
  corpora: CorpusFacet[];
};

// Writers group by the role their recorded name carries: the Gurus, then the
// Bhagats, then the Bhatts, then everyone else (Bhai Gurdaas Ji, Sathaa &
// Balvand). The names come from BaniDB, so this reads the prefix rather than
// keeping a hand-maintained roster that a re-ingest could out-date.
function writerGroup(name: string): string {
  if (name.startsWith('Guru ')) return 'Gurus';
  if (name.startsWith('Bhagat ')) return 'Bhagats';
  if (name.startsWith('Bhatt ')) return 'Bhatts';
  return 'Others';
}
const GROUP_ORDER = ['Gurus', 'Bhagats', 'Bhatts', 'Others'];

export default function FilterPanel({ filters, onChange, raags, writers, corpora }: Props) {
  const count = activeFilterCount(filters);

  const writerOptions: Option[] = [...writers]
    .sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(writerGroup(a.name));
      const gb = GROUP_ORDER.indexOf(writerGroup(b.name));
      // Within a group, the most-represented writer first.
      return ga - gb || b.lineCount - a.lineCount;
    })
    .map((w) => ({
      value: w.name,
      label: w.name,
      hint: w.lineCount.toLocaleString(),
      group: writerGroup(w.name),
    }));

  const raagOptions: Option[] = raags.map((r) => ({
    value: r.name,
    label: r.name,
    hint: r.lineCount.toLocaleString(),
  }));

  const corpusOptions: Option[] = corpora.map((c) => ({
    value: String(c.id),
    label: c.name,
    hint: c.lineCount.toLocaleString(),
  }));

  function setAng(key: 'angMin' | 'angMax', value: number | undefined) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-[#7a6045] hover:text-[#5c3d1e] select-none list-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        Filters
        {count > 0 && (
          <span className="ml-1 text-xs bg-[#8b5e3c] text-[#fdf6ec] rounded-full px-1.5">
            {count}
          </span>
        )}
      </summary>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MultiSelect
          label="Scripture"
          allLabel="All scriptures"
          options={corpusOptions}
          selected={(filters.sources ?? []).map(String)}
          onChange={(vals) =>
            onChange({ ...filters, sources: vals.length ? vals.map(Number) : undefined })
          }
        />

        <MultiSelect
          label="Writer"
          allLabel="All writers"
          options={writerOptions}
          selected={filters.writers ?? []}
          onChange={(vals) => onChange({ ...filters, writers: vals.length ? vals : undefined })}
        />

        <MultiSelect
          label="Raag"
          allLabel="All raags"
          options={raagOptions}
          selected={filters.raags ?? []}
          onChange={(vals) => onChange({ ...filters, raags: vals.length ? vals : undefined })}
        />

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#7a6045] font-medium uppercase tracking-wide">Ang from</span>
          <input
            type="number"
            min={1} max={1430}
            value={filters.angMin ?? ''}
            onChange={e => setAng('angMin', e.target.value ? parseInt(e.target.value) : undefined)}
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
            onChange={e => setAng('angMax', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="1430"
            className="px-2 py-1.5 rounded border border-[#c8b89a] bg-[#fdf6ec] text-sm text-[#3d2b1f]"
          />
        </label>
      </div>

      {count > 0 && (
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
