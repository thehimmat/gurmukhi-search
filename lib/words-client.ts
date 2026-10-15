import type { Word } from './supabase';
import type { FuzzyLevel } from './fuzzy';

// The Dictionary's filters: which scriptures and writers a word must appear in.
export type WordFilters = { sources?: number[]; writers?: string[] };

export type WordHit = Word & { match?: 'fold' };

// The Dictionary lookup as the browser calls it. An error response throws, so
// a failed lookup isn't shown as "no results".
export async function fetchWords(
  query: string,
  fuzzy: FuzzyLevel,
  signal?: AbortSignal,
  filters: WordFilters = {},
): Promise<WordHit[]> {
  const params = new URLSearchParams({ q: query });
  if (fuzzy) params.set('fuzzy', String(fuzzy));
  // Sorted, so the same selection is the same URL (and CDN cache entry).
  [...(filters.sources ?? [])].sort((a, b) => a - b).forEach((id) => params.append('source', String(id)));
  [...(filters.writers ?? [])].sort().forEach((w) => params.append('writer', w));
  const res = await fetch(`/api/words?${params}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Lookup failed (${res.status})`);
  return body.words ?? [];
}
