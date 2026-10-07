// Words shown before any search (replaces the faded ੴ placeholder). Two
// fixed, editorial lists; only their occurrence counts come from the DB, so
// the words render instantly and the counts fill in.

/** The Mool Mantar, word by word, as it opens Sri Guru Granth Sahib Ji. */
export const MOOL_MANTAR = [
  'ੴ', 'ਸਤਿ', 'ਨਾਮੁ', 'ਕਰਤਾ', 'ਪੁਰਖੁ', 'ਨਿਰਭਉ', 'ਨਿਰਵੈਰੁ',
  'ਅਕਾਲ', 'ਮੂਰਤਿ', 'ਅਜੂਨੀ', 'ਸੈਭੰ', 'ਗੁਰ', 'ਪ੍ਰਸਾਦਿ',
] as const;

/** Core concepts of Gurbani; each has at least one sourced definition in kosh. */
export const CONCEPTS = [
  'ਹੁਕਮੁ', 'ਹਉਮੈ', 'ਨਾਮੁ', 'ਗੁਰਮੁਖਿ', 'ਸਬਦੁ', 'ਮਨੁ',
  'ਸਚੁ', 'ਮਾਇਆ', 'ਭਗਤਿ', 'ਨਦਰਿ', 'ਸੇਵਾ', 'ਸੰਗਤਿ',
] as const;

/** Every word either list shows, once, for a single DB lookup. */
export const LANDING_WORDS: string[] = [...new Set<string>([...MOOL_MANTAR, ...CONCEPTS])];

export type CountedWord = { gurmukhi: string; frequency: number | null };

/** Attach DB counts to a list, keeping its order; null where the DB had no row. */
export function withCounts(
  words: readonly string[],
  rows: { gurmukhi: string; frequency: number }[],
): CountedWord[] {
  const byWord = new Map(rows.map(r => [r.gurmukhi.normalize('NFC'), r.frequency]));
  return words.map(w => ({ gurmukhi: w, frequency: byWord.get(w.normalize('NFC')) ?? null }));
}
