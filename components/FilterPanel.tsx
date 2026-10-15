'use client';

import type {
  SearchFilters,
  WriterFacet,
  RaagFacet,
  CorpusFacet,
  NumberRoleFacet,
} from '@/lib/supabase';
import { activeFilterCount } from '@/lib/filters';
import {
  DEFAULT_NUMBER_ROLES,
  NUMBER_ROLES,
  NUMBER_ROLE_LABELS,
  NumberRole,
} from '@/lib/numbers';
import MultiSelect, { Option } from './MultiSelect';
import { DEFAULT_SOURCES } from '@/lib/scriptures';

type Props = {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  raags: RaagFacet[];
  writers: WriterFacet[];
  corpora: CorpusFacet[];
  // Set only while a digits-only query is showing. The counts arrive with the
  // search response because they are scoped to the number being searched.
  numberRoleFacets?: NumberRoleFacet[] | null;
  showNumberRoles?: boolean;
  // Word search filters by where a word is used (scripture, writer); raag and
  // ang range narrow lines, so they're left out there.
  facets?: 'lines' | 'words';
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

export default function FilterPanel({
  filters,
  onChange,
  raags,
  writers,
  corpora,
  numberRoleFacets,
  showNumberRoles = false,
  facets = 'lines',
}: Props) {
  const lineFacets = facets === 'lines';
  const count = activeFilterCount(filters);

  // Counts may not have arrived yet (first keystroke) — the boxes still render,
  // just without a number beside them, so the filter never pops in late.
  const countFor = (role: NumberRole) =>
    numberRoleFacets?.find((f) => f.role === role)?.lineCount;

  const numberRoleOptions: Option[] = NUMBER_ROLES.filter(
    // A role with no hits for this number is noise; drop it once counts exist.
    (role) => countFor(role) !== 0,
  ).map((role) => ({
    value: role,
    label: NUMBER_ROLE_LABELS[role],
    hint: countFor(role)?.toLocaleString(),
  }));

  const selectedNumberRoles = filters.numberRoles ?? DEFAULT_NUMBER_ROLES;

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
    <div>

      <div className={`grid grid-cols-2 gap-3 ${!lineFacets ? 'sm:grid-cols-2' : showNumberRoles ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}>
        {showNumberRoles && (
          <MultiSelect
            label="Number is a"
            // Unlike the other facets, an empty selection here means "show
            // nothing" rather than "no filter", so it must not read "Any".
            allLabel="No roles"
            options={numberRoleOptions}
            selected={selectedNumberRoles}
            // [] is a real state here (show nothing), so it is stored as an
            // empty array rather than collapsing to undefined the way the
            // other facets do — undefined means "use the heading defaults".
            onChange={(vals) => onChange({ ...filters, numberRoles: vals })}
          />
        )}

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

        {lineFacets && (
          <>
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
          </>
        )}
      </div>

      {count > 0 && (
        <button
          onClick={() => onChange({ sources: [...DEFAULT_SOURCES], ...(showNumberRoles ? { numberRoles: undefined } : {}) })}
          className="mt-2 text-xs text-[#8b5e3c] hover:underline"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
