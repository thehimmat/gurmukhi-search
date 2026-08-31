// Search query builders — each mode returns { results, total }.
// All queries target the kosh Supabase DB (read-only via anon key).

import {
  supabase,
  LineWithMeta,
  SearchFilters,
  Word,
  WriterFacet,
  RaagFacet,
  CorpusFacet,
} from './supabase';
import { compilePattern } from './pattern-compiler';
import {
  LetterSetQuery,
  Scope,
  WordSort,
  FilterMode,
  matchesLetterSet,
  validateLetterSet,
  sortWords,
  filterWords,
} from './letterset';
import { getWordIndex } from './word-index';

// View options for word-scope Letter Set results (ordering + in-result filter).
export type WordViewOptions = {
  sort?: WordSort;
  filter?: string;
  filterMode?: FilterMode;
};

export const PAGE_SIZE = 20;

export type SearchResult = {
  lines: LineWithMeta[];
  words?: Word[];
  total: number | null; // null = unknown (line scope skips an expensive exact count)
  hasMore?: boolean; // used when total is null, to drive the "Load more" button
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
  // Multi-select facets: several values mean "any of these", so `in` not `eq`.
  if (filters.raags?.length)   query = query.in('shabads.raag_english', filters.raags);
  if (filters.writers?.length) query = query.in('shabads.writer_english', filters.writers);
  if (filters.sources?.length) query = query.in('source_fk', filters.sources);
  if (filters.angMin != null) query = query.gte('ang', filters.angMin);
  if (filters.angMax != null) query = query.lte('ang', filters.angMax);
  return query;
}

// A raag or writer filter must exclude lines whose shabad does not match, so the
// embed has to be an inner join; without such a filter it stays a left join,
// which keeps lines that carry no shabad metadata at all. The two selects are
// spelled out as literals because supabase-js types the response off the string.
function needsShabadJoin(filters: SearchFilters): boolean {
  return !!(filters.raags?.length || filters.writers?.length);
}

const COUNT_SELECT = 'id, shabads(raag_english, writer_english)';
const COUNT_SELECT_INNER = 'id, shabads!inner(raag_english, writer_english)';
const LINE_SELECT =
  '*, shabads(raag_english, raag_gurmukhi, writer_english, writer_id, ang_start)';
const LINE_SELECT_INNER =
  '*, shabads!inner(raag_english, raag_gurmukhi, writer_english, writer_id, ang_start)';

// The line-search RPCs take the same facets as arrays; null means unfiltered.
function rpcFilterArgs(filters: SearchFilters) {
  return {
    p_raags: filters.raags?.length ? filters.raags : null,
    p_writers: filters.writers?.length ? filters.writers : null,
    p_sources: filters.sources?.length ? filters.sources : null,
    p_ang_min: filters.angMin ?? null,
    p_ang_max: filters.angMax ?? null,
  };
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
    .select(needsShabadJoin(filters) ? COUNT_SELECT_INNER : COUNT_SELECT, { count: 'exact', head: true });

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
    .select(needsShabadJoin(filters) ? COUNT_SELECT_INNER : COUNT_SELECT, { count: 'exact', head: true })
    .ilike('gurmukhi', `%${searchText}%`);
  countQ = applyFilters(countQ, filters);
  const { count, error: countErr } = await countQ;
  if (countErr) return { lines: [], total: 0, error: countErr.message };

  let dataQ = supabase
    .from('lines')
    .select(needsShabadJoin(filters) ? LINE_SELECT_INNER : LINE_SELECT)
    .ilike('gurmukhi', `%${searchText}%`)
    // Corpus first (SGGS, then Dasam Bani, then Bhai Gurdas Ji Vaaran), then
    // reading order within it: (ang, line_no) alone interleaves the corpora.
    // The rank is lines.corpus_rank (kosh migration 031); migration 005 here
    // applies the same sort inside the search RPCs.
    .order('corpus_rank', { ascending: true })
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
    ...rpcFilterArgs(filters),
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
    ...rpcFilterArgs(filters),
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
  view: WordViewOptions = {},
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
    // Apply the in-result text filter and ordering over the *full* match set,
    // then paginate — so both work even with far more results than one page.
    const filtered = filterWords(matched, view.filter ?? '', view.filterMode ?? 'prefix');
    const ordered = sortWords(filtered, view.sort ?? 'freq_desc');
    const offset = page * PAGE_SIZE;
    return {
      lines: [],
      words: ordered.slice(offset, offset + PAGE_SIZE),
      total: ordered.length,
    };
  }

  // Line scope: map matching word ids → lines containing them. We fetch one extra
  // row to learn whether another page exists, rather than computing an exact total
  // (a distinct-line count over the full corpus blew past the 3s statement timeout).
  if (matched.length === 0) return { lines: [], total: 0, hasMore: false };
  const offset = page * PAGE_SIZE;
  const { data, error } = await supabase.rpc('search_lines_by_word_ids', {
    p_word_ids: matched.map((w) => w.id),
    ...rpcFilterArgs(filters),
    p_limit: PAGE_SIZE + 1,
    p_offset: offset,
  });
  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as FlatLineRow[];
  const hasMore = rows.length > PAGE_SIZE;
  return { lines: rows.slice(0, PAGE_SIZE).map(mapFlatLineRow), total: null, hasMore };
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

// Each facet list comes from a SQL DISTINCT (migration 006). Reading `shabads`
// through PostgREST instead silently capped at 1000 rows, so the dropdowns only
// ever showed the writers and raags that fell in that first slice.

export async function listRaags(): Promise<RaagFacet[]> {
  const { data, error } = await supabase.rpc('list_raags');
  if (error) throw new Error(`list_raags: ${error.message}`);
  return ((data ?? []) as Array<{ raag_english: string; line_count: number }>)
    .map((r) => ({ name: r.raag_english, lineCount: Number(r.line_count) }));
}

export async function listWriters(): Promise<WriterFacet[]> {
  const { data, error } = await supabase.rpc('list_writers');
  if (error) throw new Error(`list_writers: ${error.message}`);
  return ((data ?? []) as Array<{ writer_english: string; line_count: number; source_ids: number[] }>)
    .map((r) => ({
      name: r.writer_english,
      lineCount: Number(r.line_count),
      sourceIds: (r.source_ids ?? []).map(Number),
    }));
}

// Scriptures, in reading order (SGGS, Dasam Bani, Bhai Gurdas Ji Vaaran).
export async function listCorpora(): Promise<CorpusFacet[]> {
  const { data, error } = await supabase.rpc('list_corpora');
  if (error) throw new Error(`list_corpora: ${error.message}`);
  return ((data ?? []) as Array<{ id: number; code: string; name: string; line_count: number }>)
    .map((r) => ({ id: Number(r.id), code: r.code, name: r.name, lineCount: Number(r.line_count) }));
}
