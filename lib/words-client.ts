import type { Word } from './supabase';
import type { FuzzyLevel } from './fuzzy';

export type WordHit = Word & { match?: 'fold' };

// The Dictionary lookup as the browser calls it. An error response throws, so
// a failed lookup isn't shown as "no results".
export async function fetchWords(query: string, fuzzy: FuzzyLevel, signal?: AbortSignal): Promise<WordHit[]> {
  const params = new URLSearchParams({ q: query });
  if (fuzzy) params.set('fuzzy', String(fuzzy));
  const res = await fetch(`/api/words?${params}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Lookup failed (${res.status})`);
  return body.words ?? [];
}
