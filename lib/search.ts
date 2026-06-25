// Search query builders — each mode returns { results, total }.
// All queries target the kosh Supabase DB (read-only via anon key).

import { supabase, LineWithMeta, SearchFilters, Word } from './supabase';
import { compilePattern } from './pattern-compiler';
import {
  LetterSetQuery,
  Scope,
  matchesLetterSet,
  validateLetterSet,
} from './letterset';
import { getWordIndex } from './word-index';

export const PAGE_SIZE = 20;

export type SearchResult = {
  lines: LineWithMeta[];
  words?: Word[];
  total: number;
  error?: string;
};

// The regex RPCs return shabad metadata as flat columns; the line components
// expect it nested under `shabads`. Reshape flat rows into LineWithMeta.
type FlatLineRow = LineWithMeta & {
  raag_english: string | null;
  raag_gurmukhi: string | null;
  writer_english: string | null;
  writer_id: number | null;
  ang_start: number | null;
  total_count?: number;
};

function mapFlatLineRow(r: FlatLineRow): LineWithMeta {
  const hasShabad = r.raag_english || r.raag_gurmukhi || r.writer_english;
  return {
    id: r.id,
    verse_id: r.verse_id,
    shabad_id: r.shabad_id,
    ang: r.ang,
    line_no: r.line_no,
    gurmukhi: r.gurmukhi,
    translation_en: r.translation_en,
    transliteration_en: r.transliteration_en,
    shabads: hasShabad
      ? {
          id: r.shabad_id ?? 0,
          raag_english: r.raag_english,
          raag_gurmukhi: r.raag_gurmukhi,
          writer_english: r.writer_english,
          writer_id: r.writer_id,
          ang_start: r.ang_start ?? 0,
        }
      : null,
  };
}

// Apply shared filters to a Supabase query builder.
// `q` must already be selecting from `lines` with a `shabads` join.
function applyFilters<T>(
  q: T,
  filters: SearchFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = q as any;
  if (filters.raag)    query = query.eq('shabads.raag_english', filters.raag);
  if (filters.writer)  query = query.eq('shabads.writer_english', filters.writer);
  if (filters.angMin != null) query = query.gte('ang', filters.angMin);
  if (filters.angMax != null) query = query.lte('ang', filters.angMax);
  return query;
}

// ─── Mode 1: Contains ─────────────────────────────────────────────────────────
// Simple substring / regex search on lines.gurmukhi.
// `searchText` is treated as a literal substring unless `asRegex` is true.
export async function searchContains(
  searchText: string,
  filters: SearchFilters = {},
  page = 0,
  asRegex = false,
): Promise<SearchResult> {
  const offset = page * PAGE_SIZE;
  // Count query
  let countQ = supabase
    .from('lines')
    .select('id, shabads!inner(raag_english, writer_english)', { count: 'exact', head: true });

  countQ = applyFilters(countQ, filters);
  if (asRegex) {
    countQ = countQ.filter('gurmukhi', 'cs', searchText); // placeholder; see below
  } else {
    countQ = countQ.ilike('gurmukhi', `%${searchText}%`);
  }

  // For regex, use RPC since Supabase JS doesn't expose ~ directly.
  // We always use RPC for both count and data to keep it consistent.
  if (asRegex) {
    return searchByRegex(searchText, filters, page);
  }

  countQ = supabase
    .from('lines')
    .select('id, shabads!inner(raag_english, writer_english)', { count: 'exact', head: true })
    .ilike('gurmukhi', `%${searchText}%`);
  countQ = applyFilters(countQ, filters);
  const { count, error: countErr } = await countQ;
  if (countErr) return { lines: [], total: 0, error: countErr.message };

  let dataQ = supabase
    .from('lines')
    .select('*, shabads(raag_english, raag_gurmukhi, writer_english, writer_id, ang_start)')
    .ilike('gurmukhi', `%${searchText}%`)
    .order('ang', { ascending: true })
    .order('line_no', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);
  dataQ = applyFilters(dataQ, filters);

  const { data, error } = await dataQ;
  if (error) return { lines: [], total: 0, error: error.message };

  return { lines: (data ?? []) as LineWithMeta[], total: count ?? 0 };
}

// ─── Mode 1b: Regex search (via RPC) ─────────────────────────────────────────
// Calls a Postgres function that runs the ~ operator.
async function searchByRegex(
  regex: string,
  filters: SearchFilters,
  page: number,
): Promise<SearchResult> {
  const offset = page * PAGE_SIZE;
  const { data, error } = await supabase.rpc('search_lines_regex', {
    p_regex: regex,
    p_raag: filters.raag ?? null,
    p_writer: filters.writer ?? null,
    p_ang_min: filters.angMin ?? null,
    p_ang_max: filters.angMax ?? null,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as FlatLineRow[];
  const total = rows[0]?.total_count ?? 0;
  return { lines: rows.map(mapFlatLineRow), total };
}

// ─── Word-scope regex (via RPC) ───────────────────────────────────────────────
// Runs the same compiled regex against individual word forms (words.gurmukhi).
async function searchWordsByRegex(regex: string, page: number): Promise<SearchResult> {
  const offset = page * PAGE_SIZE;
  const { data, error } = await supabase.rpc('search_words_regex', {
    p_regex: regex,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as Array<Word & { total_count: number }>;
  const total = rows[0]?.total_count ?? 0;
  const words = rows.map((r) => ({ id: r.id, gurmukhi: r.gurmukhi, frequency: r.frequency }));
  return { lines: [], words, total };
}

// ─── Mode 2: First-letter search ─────────────────────────────────────────────
// `letters` is a Gurmukhi string: first char must match word[0], second char word[1], etc.
// Calls a Postgres function that joins word_occurrences.
export async function searchFirstLetters(
  letters: string,
  filters: SearchFilters = {},
  page = 0,
): Promise<SearchResult> {
  if (!letters.trim()) return { lines: [], total: 0 };

  const gurmukhi_letters = [...letters]; // split by codepoint
  const offset = page * PAGE_SIZE;

  const { data, error } = await supabase.rpc('search_first_letters', {
    p_letters: gurmukhi_letters,
    p_raag: filters.raag ?? null,
    p_writer: filters.writer ?? null,
    p_ang_min: filters.angMin ?? null,
    p_ang_max: filters.angMax ?? null,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as FlatLineRow[];
  const total = rows[0]?.total_count ?? 0;
  return { lines: rows.map(mapFlatLineRow), total };
}

// ─── Mode 3: Pattern search ───────────────────────────────────────────────────
// `pattern` uses the wildcard syntax defined in pattern-compiler.ts.
// Compiles to a regex, then searches words.gurmukhi, returning lines containing matches.
export async function searchPattern(
  pattern: string,
  filters: SearchFilters = {},
  page = 0,
  scope: Scope = 'line',
): Promise<SearchResult> {
  const compiled = compilePattern(pattern);
  if (!compiled.ok) return { lines: [], total: 0, error: compiled.error };
  if (scope === 'word') return searchWordsByRegex(compiled.regex, page);
  return searchByRegex(compiled.regex, filters, page);
}

// ─── Mode 4: Letter Set search ────────────────────────────────────────────────
// Scrabble/Boggle-style "which words can I build from this set of letters?".
// Filters the cached word index with the pure matchesLetterSet predicate, then:
//   word scope → paginate the matching words (already frequency-sorted)
//   line scope → fetch lines containing any matching word via RPC
export async function searchLetterSet(
  query: LetterSetQuery,
  filters: SearchFilters = {},
  page = 0,
): Promise<SearchResult> {
  const valid = validateLetterSet(query);
  if (!valid.ok) return { lines: [], total: 0, error: valid.error };

  let index: Word[];
  try {
    index = await getWordIndex();
  } catch (e) {
    return { lines: [], total: 0, error: (e as Error).message };
  }

  // index is ordered by frequency desc, so matches keep that order.
  const matched = index.filter((w) => matchesLetterSet(w.gurmukhi, query));

  if (query.scope === 'word') {
    const offset = page * PAGE_SIZE;
    return {
      lines: [],
      words: matched.slice(offset, offset + PAGE_SIZE),
      total: matched.length,
    };
  }

  // Line scope: map matching word ids → lines containing them.
  if (matched.length === 0) return { lines: [], total: 0 };
  const offset = page * PAGE_SIZE;
  const { data, error } = await supabase.rpc('search_lines_by_word_ids', {
    p_word_ids: matched.map((w) => w.id),
    p_raag: filters.raag ?? null,
    p_writer: filters.writer ?? null,
    p_ang_min: filters.angMin ?? null,
    p_ang_max: filters.angMax ?? null,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as FlatLineRow[];
  const total = rows[0]?.total_count ?? 0;
  return { lines: rows.map(mapFlatLineRow), total };
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

export async function listRaags(): Promise<string[]> {
  const { data } = await supabase
    .from('shabads')
    .select('raag_english')
    .not('raag_english', 'is', null)
    .order('raag_english');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    if (row.raag_english && !seen.has(row.raag_english)) {
      seen.add(row.raag_english);
      out.push(row.raag_english);
    }
  }
  return out;
}

export async function listWriters(): Promise<string[]> {
  const { data } = await supabase
    .from('shabads')
    .select('writer_english')
    .not('writer_english', 'is', null)
    .order('writer_english');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    if (row.writer_english && !seen.has(row.writer_english)) {
      seen.add(row.writer_english);
      out.push(row.writer_english);
    }
  }
  return out;
}
