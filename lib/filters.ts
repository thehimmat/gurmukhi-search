// Client-safe filter helpers. Kept out of lib/supabase.ts, which creates the
// Supabase client on import: a client component importing a value from there
// shipped all of @supabase/supabase-js to the browser (#38).
import type { SearchFilters } from './supabase';
import { isDefaultSources } from './sources';

// The highest ang the range inputs accept. kosh's sources table carries no
// page count per scripture, so this is Sri Guru Granth Sahib Ji's 1430.
export const ANG_MAX = 1430;

type AngEnd = number | undefined;

// Tidies an ang range typed into the filter: whole numbers in 1..max, a
// reversed range swapped, an empty end left empty.
export function clampAngRange(from: AngEnd, to: AngEnd, max: number): { from: AngEnd; to: AngEnd } {
  const tidy = (n: AngEnd) => (n == null || Number.isNaN(n) ? undefined : Math.min(max, Math.max(1, Math.trunc(n))));
  const a = tidy(from), b = tidy(to);
  return a != null && b != null && a > b ? { from: b, to: a } : { from: a, to: b };
}

export function activeFilterCount(f: SearchFilters, defaultSources: number[]): number {
  return (
    (f.raags?.length ? 1 : 0) +
    (f.writers?.length ? 1 : 0) +
    // The default scriptures are not "narrowing"; any other choice is,
    // including clearing to all scriptures.
    (isDefaultSources(f.sources, defaultSources) ? 0 : 1) +
    (f.angMin != null ? 1 : 0) +
    (f.angMax != null ? 1 : 0)
  );
  // numberRoles is deliberately not counted: it is always set for a numeric
  // query, so counting it would leave the badge permanently non-zero and stop
  // meaning "you have narrowed something".
}
