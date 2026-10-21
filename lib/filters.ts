// Client-safe filter helpers. Kept out of lib/supabase.ts, which creates the
// Supabase client on import: a client component importing a value from there
// shipped all of @supabase/supabase-js to the browser (#38).
import type { SearchFilters } from './supabase';
import { isDefaultSources } from './sources';

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
