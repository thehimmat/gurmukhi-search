// In-memory cache of the full word list, used by Letter Set search to run the
// matchesLetterSet predicate over every word (the way a Boggle/Scrabble solver
// iterates a dictionary). Loaded once per server instance and reused.

import { supabase, Word } from './supabase';

const CHUNK = 1000; // Supabase caps a single select at 1000 rows

let cache: Word[] | null = null;
let loading: Promise<Word[]> | null = null;

async function fetchAllWords(): Promise<Word[]> {
  const all: Word[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('words')
      .select('id, gurmukhi, frequency')
      // Secondary sort by id gives a *stable* total order so ranged pagination
      // never duplicates or skips rows that share a frequency.
      .order('frequency', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Word[];
    all.push(...rows);
    if (rows.length < CHUNK) break;
    from += CHUNK;
  }
  return all;
}

// Returns the cached word index, loading it on first use. Concurrent callers
// share the same in-flight promise; a failed load is not cached.
export function getWordIndex(): Promise<Word[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = fetchAllWords()
      .then((words) => {
        cache = words;
        return words;
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}
