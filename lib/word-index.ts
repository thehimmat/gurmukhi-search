// In-memory cache of the full word list, used by Letter Set search to run the
// matchesLetterSet predicate over every word (the way a Boggle/Scrabble solver
// iterates a dictionary). Loaded once per server instance and reused.

import { supabase, Word } from './supabase';

let cache: Word[] | null = null;
let loading: Promise<Word[]> | null = null;

async function fetchAllWords(): Promise<Word[]> {
  // Single round-trip: words_index() returns the whole list as one jsonb array,
  // pre-sorted by frequency. (A table select is capped at 1000 rows, which would
  // mean ~30 sequential requests — the main cost of a cold first search.)
  const { data, error } = await supabase.rpc('words_index');
  if (error) throw new Error(error.message);
  return (data ?? []) as Word[];
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
