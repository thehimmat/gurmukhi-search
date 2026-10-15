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
  NumberRoleFacet,
} from './supabase';
import { DEFAULT_NUMBER_ROLES } from './numbers';
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
import type { FuzzyLevel } from './fuzzy';
import { escapeLike } from './like';
import { LINE_SELECT } from './feed';

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
  // Per-role counts for a number query, so the role checkboxes can be labelled
  // and a role with no hits disabled. Travels with the result because it is
  // scoped to the searched value.
  numberRoles?: NumberRoleFacet[];
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
  // search_number_lines only (gurmukhi-kosh 033/034/036): every matched
  // numeral's offsets, as parallel arrays.
  numeral_roles?: string[] | null;
  numeral_keywords?: string[] | null;
  char_starts?: number[] | null;
  char_ends?: number[] | null;
};

// Pair the parallel offset arrays into spans.
function numeralSpans(r: FlatLineRow): { start: number; end: number }[] {
  if (!r.char_starts?.length || !r.char_ends?.length) return [];
  return r.char_starts
    .map((start, i) => ({ start, end: r.char_ends![i] }))
    .filter((s) => s.end != null);
}

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
    numeral: r.numeral_roles
      ? {
          roles: r.numeral_roles,
          keywords: r.numeral_keywords ?? [],
          spans: numeralSpans(r),
        }
      : undefined,
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
// Literal substring search on lines.gurmukhi.
export async function searchContains(
  searchText: string,
  filters: SearchFilters = {},
  page = 0,
  fuzzy: FuzzyLevel = 0,
): Promise<SearchResult> {
  if (fuzzy > 0) return searchContainsFuzzy(searchText, filters, page, fuzzy);

  // The exact total is counted on the first page only, alongside the rows:
  // since kosh 046's trigram index it costs tens of milliseconds, and later
  // pages keep the total they already have. A count that fails (or times out)
  // just leaves the total unknown; the extra row still says whether another
  // page exists. `like`, not `ilike`: Gurmukhi has no case, and both use the
  // trigram index, but like skips the case-folding work.
  const offset = page * PAGE_SIZE;
  const pattern = `%${escapeLike(searchText)}%`;
  let dataQ = supabase
    .from('lines')
    .select(needsShabadJoin(filters) ? LINE_SELECT_INNER : LINE_SELECT)
    .like('gurmukhi', pattern)
    // Corpus first (kosh 031/046 reading order), then reading order within it:
    // (ang, line_no) alone interleaves the corpora.
    .order('corpus_rank', { ascending: true })
    .order('ang', { ascending: true })
    .order('line_no', { ascending: true })
    .range(offset, offset + PAGE_SIZE);
  dataQ = applyFilters(dataQ, filters);

  const countQ = page === 0
    ? applyFilters(
        supabase
          .from('lines')
          .select(needsShabadJoin(filters) ? 'id, shabads!inner(raag_english)' : 'id', { count: 'exact', head: true })
          .like('gurmukhi', pattern),
        filters,
      )
    : null;

  const [{ data, error }, counted] = await Promise.all([dataQ, countQ]);
  if (error) return { lines: [], total: 0, error: error.message };

  const rows = (data ?? []) as LineWithMeta[];
  const total = counted && !counted.error && typeof counted.count === 'number' ? counted.count : null;
  return { lines: rows.slice(0, PAGE_SIZE), total, hasMore: rows.length > PAGE_SIZE };
}

// Above this many matches a fuzzy count stops and the total reads "20+":
// counting a near-everything High query in full can pass the anon timeout.
const FUZZY_COUNT_CAP = 10000;

// Fuzzy Contains (kosh 047): the database folds the line and the query at
// this level, and for High also lets one letter be anything. Same paging as
// above: one extra row, plus a count on the first page.
async function searchContainsFuzzy(
  searchText: string,
  filters: SearchFilters,
  page: number,
  level: FuzzyLevel,
): Promise<SearchResult> {
  const [{ data, error }, counted] = await Promise.all([
    supabase.rpc('search_lines_fuzzy', {
      p_query: searchText,
      p_level: level,
      ...rpcFilterArgs(filters),
      p_limit: PAGE_SIZE + 1,
      p_offset: page * PAGE_SIZE,
    }),
    // The total, on the first page only (kosh 052), as for exact Contains.
    page === 0
      ? supabase.rpc('count_lines_fuzzy', {
          p_query: searchText,
          p_level: level,
          ...rpcFilterArgs(filters),
          p_cap: FUZZY_COUNT_CAP,
        })
      : null,
  ]);
  if (error) return { lines: [], total: 0, error: error.message };
  const rows = (data ?? []) as FlatLineRow[];
  const n = counted && !counted.error ? Number(Array.isArray(counted.data) ? counted.data[0] : counted.data) : NaN;
  return {
    lines: rows.slice(0, PAGE_SIZE).map(mapFlatLineRow),
    total: Number.isFinite(n) && n < FUZZY_COUNT_CAP ? n : null,
    hasMore: rows.length > PAGE_SIZE,
  };
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
  fuzzy: FuzzyLevel = 0,
): Promise<SearchResult> {
  if (!letters.trim()) return { lines: [], total: 0 };

  const gurmukhi_letters = [...letters]; // split by codepoint
  const offset = page * PAGE_SIZE;

  // Fuzzy levels fold the letters and each line's first letters (kosh 047).
  const { data, error } = await supabase.rpc(fuzzy > 0 ? 'search_first_letters_fuzzy' : 'search_first_letters', {
    p_letters: gurmukhi_letters,
    ...(fuzzy > 0 ? { p_level: fuzzy } : {}),
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

// ─── Mode: Number ─────────────────────────────────────────────────────────────
// A digits-only query searches number_occurrences (migration 032 in
// gurmukhi-kosh) rather than doing a substring match on lines.gurmukhi, which
// would return every verse tally in the corpus. Roles come from the DB via
// list_number_roles, so search holds no copy of the classifier that assigns
// them — see lib/numbers.ts.

// Per-role line counts for one number, scoped to the same facets as the
// results (kosh 052), so the checkboxes agree with what's listed.
export async function listNumberRoles(value: number, filters: SearchFilters = {}): Promise<NumberRoleFacet[]> {
  const { data, error } = await supabase.rpc('count_number_roles', { p_value: value, ...rpcFilterArgs(filters) });
  if (error) throw new Error(`count_number_roles: ${error.message}`);
  return ((data ?? []) as Array<{ role: string; line_count: number }>)
    .map((r) => ({ role: r.role, lineCount: Number(r.line_count) }));
}

export async function searchNumbers(
  value: number,
  filters: SearchFilters = {},
  page = 0,
): Promise<SearchResult> {
  const offset = page * PAGE_SIZE;
  // An absent selection means the default heading roles, not "everything": an
  // unfiltered number search is ~90% verse tallies. Sending them explicitly
  // keeps the RPC's own "empty means all" contract intact for other callers.
  const roles = filters.numberRoles ?? DEFAULT_NUMBER_ROLES;

  // The counts label the checkboxes and don't change from page to page, so
  // they're fetched with the first page only. Losing them must not lose the
  // results, so a failure degrades to unlabelled boxes rather than an error.
  const roleCounts = page === 0 ? listNumberRoles(value, filters).catch(() => undefined) : Promise.resolve(undefined);

  // An empty selection is the user unchecking every box. That means "show
  // nothing", so it must not fall through to the RPC's "empty means all".
  if (roles.length === 0) {
    return { lines: [], total: 0, numberRoles: await roleCounts };
  }

  const [rows, numberRoles] = await Promise.all([
    supabase.rpc('search_number_lines', {
      p_value: value,
      p_roles: roles,
      ...rpcFilterArgs(filters),
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }),
    roleCounts,
  ]);

  if (rows.error) return { lines: [], total: 0, error: rows.error.message };

  const data = (rows.data ?? []) as FlatLineRow[];
  return {
    lines: data.map(mapFlatLineRow),
    total: data.length ? Number(data[0].total_count ?? 0) : 0,
    numberRoles,
  };
}
