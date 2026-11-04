'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';
import { useKeyboardLayout, KeyboardLayoutOptions } from '@/components/KeyboardLayoutSwitch';
import { SettingsRow } from '@/components/SettingsRow';
import { FuzzyLevelPicker, useFuzzyLevel } from '@/components/FuzzyToggle';
import { useSources } from '@/components/SourcesContext';
import { fetchMeta } from '@/lib/meta';
import { searchingLabel } from '@/lib/fuzzy';
import ModeSelector from '@/components/ModeSelector';
import FilterPanel from '@/components/FilterPanel';
import { isNumericQuery } from '@/lib/numbers';
import ResultCard from '@/components/ResultCard';
import PatternHelp from '@/components/PatternHelp';
import ScopeToggle from '@/components/ScopeToggle';
import LetterSetBuilder from '@/components/LetterSetBuilder';
import WordList from '@/components/WordList';
import WordResultControls from '@/components/WordResultControls';
import { ShabadFeed, WordFeed } from '@/components/Feeds';
import { InfiniteList } from '@/components/InfiniteList';
import { NoResults, ResultCount } from '@/components/ResultStatus';
import { ErrorNotice } from '@/components/ErrorNotice';
import { responseError, thrownError } from '@/lib/client-errors';
import { searchFailed } from '@/lib/search-state';
import { parseAppMode, searchHref, type AppMode } from '@/lib/app-url';
import { LatestRequest } from '@/lib/latest-request';
import { submitTarget } from '@/lib/kosh-submit';
import { fetchWords, type WordFilters, type WordHit } from '@/lib/words-client';
import type {
  SearchFilters,
  LineWithMeta,
  Word,
  RaagFacet,
  WriterFacet,
  CorpusFacet,
  NumberRoleFacet,
} from '@/lib/supabase';
import { activeFilterCount } from '@/lib/filters';
import { DEFAULT_LETTER_SET_QUERY, LetterSetQuery, Scope, WordSort, FilterMode } from '@/lib/letterset';

type SearchMode = 'contains' | 'first_letter' | 'pattern' | 'letterset';

// Pause after the last keystroke before searching.
const SEARCH_DEBOUNCE_MS = 250;

type SearchState = {
  lines: LineWithMeta[];
  words: Word[];
  total: number | null; // null = unknown total (line scope); use hasMore instead
  hasMore: boolean; // used when total is null
  page: number;
  loading: boolean;
  // True while a further page (not a new search) is loading.
  loadingMore: boolean;
  error: string | null;
  // A failed later page, kept apart from `error` so the results stay up and the
  // endless list waits for a retry instead of re-firing (#48).
  loadMoreError: string | null;
  committedQuery: string;
  // Per-role counts for the number currently showing; null for every other
  // kind of query. Drives the role checkboxes in FilterPanel.
  numberRoles: NumberRoleFacet[] | null;
};

export default function SearchApp() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}

function SegmentedControl({ value, onChange }: { value: AppMode; onChange: (v: AppMode) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-alt)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '3px',
        gap: '2px',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {([
        { key: 'gurbani', gurmukhi: 'ਖੋਜ', label: 'Gurbani' },
        { key: 'kosh',    gurmukhi: 'ਕੋਸ਼', label: 'Dictionary' },
      ] as { key: AppMode; gurmukhi: string; label: string }[]).map(({ key, gurmukhi, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 500,
            transition: 'background 0.15s, color 0.15s',
            background: value === key ? 'white' : 'transparent',
            color: value === key ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: value === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <span style={{ fontFamily: '"Noto Sans Gurmukhi", sans-serif', fontSize: '0.95rem' }}>
            {gurmukhi}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function KoshSearch({ query, setQuery, writers, corpora, metaFailed, onRetryMeta }: {
  // Lifted to SearchPage, which keeps it in the URL.
  query: string; setQuery: (q: string) => void;
  writers: WriterFacet[]; corpora: CorpusFacet[]; metaFailed: boolean; onRetryMeta: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<WordHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The query the shown results answer, so "no results" waits for the lookup
  // of what's typed now rather than showing during the debounce.
  const [settled, setSettled] = useState('');
  // Bumped by "Try again" to re-run the same lookup.
  const [attempt, setAttempt] = useState(0);
  // Same default scriptures as Gurbani search; the filter is applied in the
  // database (kosh 052), and a word's count is its count inside the selection.
  const { defaults } = useSources();
  const [filters, setFilters] = useState<WordFilters>({ sources: [...defaults] });
  const { layout, choose } = useKeyboardLayout();
  const fuzzy = useFuzzyLevel();
  const { onKeyDown, onPaste } = useGurmukhiInput({ value: query, onChange: setQuery, layout });

  // Each keystroke cancels the previous lookup (pending or in flight), so a
  // slow earlier response can't land over a newer one.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setSettled(''); setError(null); setLoading(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const words = await fetchWords(q, fuzzy.level, ctrl.signal, filters);
        setResults(words);
        setError(null);
        setSettled(q);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        // Don't leave the previous query's words up beside the error.
        setResults([]);
        setError(thrownError(e));
        setSettled(q);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, fuzzy.level, filters, attempt]);

  const open = (word: string) => router.push(`/word/${encodeURIComponent(word)}`);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const target = submitTarget(query, settled, results);
    if (target.kind === 'open') open(target.word);
    if (target.kind !== 'lookup') return;
    // The results on screen are for an earlier query: look this one up first.
    try {
      const words = await fetchWords(target.query, fuzzy.level, undefined, filters);
      if (words[0]) open(words[0].gurmukhi);
    } catch {
      // The debounced lookup for this query reports the error.
    }
  }

  return (
    <div style={{ padding: '2.5rem 1.5rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Look up any word from Sri Guru Granth Sahib Ji — definitions, etymology, grammar, and every occurrence.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <input
          ref={inputRef}
          className="gurmukhi"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="ਸ਼ਬਦ ਖੋਜੋ — search a word…"
          autoFocus
          style={{
            width: '100%',
            fontSize: '1.4rem',
            padding: '0.85rem 1.2rem',
            border: '2px solid var(--border)',
            borderRadius: '6px',
            background: 'white',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </form>

      <div style={{ marginBottom: '0.5rem' }}>
        <SettingsRow
          items={[
            {
              id: 'filters',
              label: 'Filters',
              badge: activeFilterCount(filters, defaults),
              content: (
                <FilterPanel
                  facets="words"
                  filters={filters}
                  onChange={f => setFilters({ sources: f.sources, writers: f.writers })}
                  raags={[]}
                  writers={writers}
                  corpora={corpora}
                  unavailable={metaFailed}
                  onRetry={onRetryMeta}
                />
              ),
            },
            {
              id: 'fuzzy',
              label: 'Fuzzy',
              content: <FuzzyLevelPicker level={fuzzy.level} onChange={fuzzy.choose} />,
            },
            {
              id: 'keyboard',
              label: 'Keyboard',
              content: <KeyboardLayoutOptions layout={layout} onChange={next => { choose(next); inputRef.current?.focus(); }} />,
            },
          ]}
        />
      </div>

      {loading && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.25rem' }}>
          {searchingLabel(fuzzy.level)}
        </p>
      )}

      {results.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, border: '1px solid var(--border)', borderRadius: '6px', background: 'white', overflow: 'hidden' }}>
          {results.map((word, i) => (
            <li key={word.id}>
              <a
                href={`/word/${encodeURIComponent(word.gurmukhi)}`}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '1rem',
                  padding: '0.85rem 1.2rem',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--accent-light)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent')}
              >
                <span className="gurmukhi-lg" style={{ flex: 1 }}>{word.gurmukhi}</span>
                {word.match === 'fold' && (
                  <span className="badge" title="Spelling-variant match (fuzzy)">similar</span>
                )}
                <span className="badge" title="occurrences in the selected scriptures">{word.frequency.toLocaleString()}×</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {error && !loading && (
        <div style={{ marginTop: '0.5rem' }}>
          <ErrorNotice message={error} onRetry={() => setAttempt(n => n + 1)} />
        </div>
      )}

      {!loading && !error && settled && settled === query.trim() && results.length === 0 && (
        <NoResults query={settled} />
      )}

      {!query.trim() && (
        <div style={{ marginTop: '1.5rem' }}>
          <WordFeed />
        </div>
      )}
    </div>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const initialMode = parseAppMode(searchParams.get('mode'));
  const initialQuery = searchParams.get('q') ?? '';

  const [appMode, setAppMode] = useState<AppMode>(initialMode);
  // Each zone keeps its own box; the URL holds the one showing.
  const [query, setQuery] = useState(initialMode === 'gurbani' ? initialQuery : '');
  const [koshQuery, setKoshQuery] = useState(initialMode === 'kosh' ? initialQuery : '');
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<SearchMode>('contains');
  const [patternScope, setPatternScope] = useState<Scope>('line');
  const [letterSet, setLetterSet] = useState<LetterSetQuery>(DEFAULT_LETTER_SET_QUERY);
  // Word-scope result view options (Letter Set): ordering + in-result filter.
  const [wordSort, setWordSort] = useState<WordSort>('freq_desc');
  const [wordFilter, setWordFilter] = useState('');
  const [wordFilterMode, setWordFilterMode] = useState<FilterMode>('prefix');
  const { defaults } = useSources();
  const [filters, setFilters] = useState<SearchFilters>({ sources: [...defaults] });
  const { layout, choose: chooseLayout } = useKeyboardLayout();
  const fuzzy = useFuzzyLevel();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fuzzyLevelRef = useRef(fuzzy.level);
  fuzzyLevelRef.current = fuzzy.level;
  const [raags, setRaags] = useState<RaagFacet[]>([]);
  const [writers, setWriters] = useState<WriterFacet[]>([]);
  const [corpora, setCorpora] = useState<CorpusFacet[]>([]);
  const [state, setState] = useState<SearchState>({
    lines: [],
    words: [],
    total: 0,
    hasMore: false,
    page: 0,
    loading: false,
    loadingMore: false,
    error: null,
    loadMoreError: null,
    committedQuery: '',
    numberRoles: null,
  });
  const [metaFailed, setMetaFailed] = useState(false);

  const [request] = useState(() => new LatestRequest());
  // Latest mode-specific inputs, so load-more / filter re-runs read fresh values.
  const patternScopeRef = useRef(patternScope);
  patternScopeRef.current = patternScope;
  const letterSetRef = useRef(letterSet);
  letterSetRef.current = letterSet;
  const wordSortRef = useRef(wordSort);
  wordSortRef.current = wordSort;
  const wordFilterRef = useRef(wordFilter);
  wordFilterRef.current = wordFilter;
  const wordFilterModeRef = useRef(wordFilterMode);
  wordFilterModeRef.current = wordFilterMode;

  // After fetchMeta's own retry, a failure says so in the Filters panel, with
  // a Retry, rather than leaving every dropdown at "No options".
  const loadMeta = useCallback(() => {
    setMetaFailed(false);
    fetchMeta()
      .then(({ raags, writers, corpora }) => {
        setRaags(raags ?? []);
        setWriters(writers ?? []);
        setCorpora(corpora ?? []);
      })
      .catch(() => setMetaFailed(true));
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);


  const runSearch = useCallback(async (q: string, m: SearchMode, f: SearchFilters, page: number) => {
    const isLetterSet = m === 'letterset';
    const empty = isLetterSet ? letterSetRef.current.letters.length === 0 : !q.trim();
    if (empty) {
      // Abort first: a slow response for the old query would otherwise land
      // after this and bring its results back over the feed (#49).
      request.cancel();
      setState(s => ({ ...s, lines: [], words: [], total: 0, error: null, loadMoreError: null, loading: false, loadingMore: false, committedQuery: '' }));
      return;
    }

    const signal = request.start();

    // A new first page keeps the previous results on screen until it lands, so
    // typing doesn't flash the list empty on every keystroke.
    setState(s => ({ ...s, loading: true, loadingMore: page > 0, loadMoreError: null, error: page > 0 ? s.error : null }));

    const params = new URLSearchParams({ mode: m, page: String(page) });
    // Multi-select facets repeat their param once per selected value.
    f.raags?.forEach((r) => params.append('raag', r));
    f.writers?.forEach((w) => params.append('writer', w));
    f.sources?.forEach((id) => params.append('source', String(id)));
    // Three states, and the URL has to tell them apart so a shared link
    // reproduces what was on screen:
    //   no param at all   -> never touched, use the heading defaults
    //   numrole=author... -> exactly these roles
    //   numrole=          -> every box unticked, show nothing
    // The last one has no values to list, so it needs an explicit empty param;
    // without it the URL is indistinguishable from the first case and the
    // defaults silently come back.
    if (f.numberRoles?.length) {
      f.numberRoles.forEach((r) => params.append('numrole', r));
    } else if (f.numberRoles) {
      params.set('numrole', '');
    }
    if (f.angMin != null) params.set('ang_min', String(f.angMin));
    if (f.angMax != null) params.set('ang_max', String(f.angMax));

    if (isLetterSet) {
      const ls = letterSetRef.current;
      params.set('scope', ls.scope);
      params.set('letters', ls.letters.join(','));
      params.set('repeat', ls.repeat ? '1' : '0');
      params.set('extra', ls.extra);
      params.set('slots', String(ls.wildcardSlots));
      params.set('vmode', ls.vowelMode);
      params.set('vsigns', ls.vowels.signs.join(''));
      params.set('mukta', ls.vowels.mukta ? '1' : '0');
      params.set('reqcons', ls.requireAllConsonants ? '1' : '0');
      params.set('reqvowels', ls.requireAllVowels ? '1' : '0');
      params.set('nasal', ls.allowNasalAddak ? '1' : '0');
      // Word-scope result view (ignored server-side for line scope)
      params.set('sort', wordSortRef.current);
      if (wordFilterRef.current.trim()) params.set('filter', wordFilterRef.current.trim());
      params.set('fmode', wordFilterModeRef.current);
    } else {
      params.set('q', q);
      if (fuzzyLevelRef.current > 0 && (m === 'contains' || m === 'first_letter')) {
        params.set('fz', String(fuzzyLevelRef.current));
      }
      if (m === 'pattern') params.set('scope', patternScopeRef.current);
    }

    try {
      const res = await fetch(`/api/search?${params}`, { signal });
      if (!res.ok) {
        const message = await responseError(res);
        if (!signal.aborted) setState(s => searchFailed(s, page, message));
        return;
      }
      const json = await res.json();
      if (signal.aborted) return;

      setState(s => ({
        loading: false,
        loadingMore: false,
        error: null,
        loadMoreError: null,
        // Totals and role counts come with the first page only (kosh 052);
        // later pages keep the ones already shown.
        total: page === 0 ? json.total : (json.total ?? s.total),
        hasMore: json.hasMore ?? false,
        page,
        committedQuery: isLetterSet ? 'letterset' : q,
        lines: page === 0 ? (json.lines ?? []) : [...s.lines, ...(json.lines ?? [])],
        words: page === 0 ? (json.words ?? []) : [...s.words, ...(json.words ?? [])],
        // Absent on a non-number search, which is what clears the checkboxes.
        numberRoles: page === 0 ? (json.numberRoles ?? null) : s.numberRoles,
      }));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setState(s => searchFailed(s, page, thrownError(e)));
      }
    }
  }, [request]);

  function handleSubmit() { runSearch(query, searchMode, filtersRef.current, 0); }

  // Search as you type: the latest query runs once typing pauses. runSearch
  // aborts the request before it, so a slow early response can't land over a
  // newer one. Letter Set has its own builder and still searches on submit.
  useEffect(() => {
    if (appMode !== 'gurbani' || searchMode === 'letterset') return;
    // Clearing the box takes effect at once, not after the pause.
    const delay = query.trim() ? SEARCH_DEBOUNCE_MS : 0;
    const t = setTimeout(() => runSearch(query, searchMode, filtersRef.current, 0), delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchMode, appMode, fuzzy.level]);
  // Keep the zone and what's typed in the URL, at the search's own pace, so
  // refresh, Back and shared links keep the search (#49).
  const shownQuery = appMode === 'kosh' ? koshQuery : query;
  useEffect(() => {
    const t = setTimeout(() => {
      const href = searchHref(appMode, shownQuery);
      if (href !== window.location.pathname + window.location.search) router.replace(href, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [appMode, shownQuery, router]);

  function switchApp(next: AppMode) {
    request.cancel();
    setState(s => ({ ...s, loading: false, loadingMore: false }));
    setAppMode(next);
  }

  function handleLoadMore() {
    if (state.loading) return;
    runSearch(state.committedQuery, searchMode, filters, state.page + 1);
  }

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (state.committedQuery) {
      runSearch(state.committedQuery, searchMode, filtersRef.current, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Toggling word/line scope re-runs the committed pattern search.
  useEffect(() => {
    if (state.committedQuery && searchMode === 'pattern') {
      runSearch(state.committedQuery, 'pattern', filtersRef.current, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternScope]);

  // Sort / filter-mode changes re-run the letter-set word search immediately.
  useEffect(() => {
    if (state.committedQuery && searchMode === 'letterset' && letterSet.scope === 'word') {
      runSearch('letterset', 'letterset', filtersRef.current, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSort, wordFilterMode]);

  // Filter text changes re-run it too, debounced while typing.
  useEffect(() => {
    if (!(state.committedQuery && searchMode === 'letterset' && letterSet.scope === 'word')) return;
    const t = setTimeout(() => runSearch('letterset', 'letterset', filtersRef.current, 0), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordFilter]);

  const displayScope: Scope =
    searchMode === 'letterset' ? letterSet.scope
    : searchMode === 'pattern' ? patternScope
    : 'line';
  const showingWords = displayScope === 'word';
  const items      = showingWords ? state.words : state.lines;
  const hasResults = items.length > 0;
  const showed     = items.length;
  const total      = state.total;
  const hasMore    = total === null ? state.hasMore : showed < total;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>

      {/* Segmented control bar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'white', padding: '0.75rem 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <SegmentedControl value={appMode} onChange={switchApp} />
        </div>
      </div>

      {/* Kosh mode */}
      {appMode === 'kosh' && (
        <KoshSearch query={koshQuery} setQuery={setKoshQuery} writers={writers} corpora={corpora} metaFailed={metaFailed} onRetryMeta={loadMeta} />
      )}

      {/* Gurbani search mode */}
      {appMode === 'gurbani' && (
        <>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
            <ModeSelector
              value={searchMode}
              onChange={m => {
                // The old mode's request must not land in the new mode (#49).
                request.cancel();
                setSearchMode(m);
                setState(s => ({ ...s, lines: [], words: [], total: 0, loading: false, loadingMore: false, error: null, loadMoreError: null, committedQuery: '' }));
              }}
            />
          </div>

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1.5rem 0' }}>
            {searchMode === 'letterset' ? (
              <LetterSetBuilder query={letterSet} onChange={setLetterSet} onSubmit={handleSubmit} />
            ) : (
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                mode={searchMode}
                layout={layout}
                inputRef={searchInputRef}
              />
            )}
          </div>

          {searchMode === 'pattern' && (
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem 1.5rem 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <PatternHelp />
              <ScopeToggle value={patternScope} onChange={setPatternScope} />
            </div>
          )}

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem 1.5rem' }}>
            <SettingsRow
              items={[
                // Filters narrow lines, so they're not offered for word-scope results.
                ...(showingWords ? [] : [{
                  id: 'filters',
                  label: 'Filters',
                  badge: activeFilterCount(filters, defaults),
                  content: (
                    <FilterPanel
                      filters={filters}
                      onChange={setFilters}
                      raags={raags}
                      writers={writers}
                      corpora={corpora}
                      unavailable={metaFailed}
                      onRetry={loadMeta}
                      numberRoleFacets={state.numberRoles}
                      // Offered as soon as the box holds only digits, so the control
                      // is visible while typing rather than appearing after results.
                      showNumberRoles={searchMode === 'contains' && isNumericQuery(query)}
                    />
                  ),
                }]),
                {
                  id: 'fuzzy',
                  label: 'Fuzzy',
                  content: <FuzzyLevelPicker level={fuzzy.level} onChange={fuzzy.choose} />,
                },
                {
                  id: 'keyboard',
                  label: 'Keyboard',
                  content: <KeyboardLayoutOptions layout={layout} onChange={next => { chooseLayout(next); searchInputRef.current?.focus(); }} />,
                },
              ]}
            />
          </div>

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem 1.5rem 3rem' }}>
            {(hasResults || state.loading) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif' }}>
                {hasResults && <ResultCount showed={showed} total={total} hasMore={hasMore} />}
                {state.loading && <span style={{ color: 'var(--accent)' }} className="animate-pulse">{searchingLabel(searchMode === 'contains' || searchMode === 'first_letter' ? fuzzy.level : 0)}</span>}
              </div>
            )}

            {state.error && !state.loading && <ErrorNotice message={state.error} onRetry={handleSubmit} />}

            {searchMode === 'letterset' && showingWords && state.committedQuery && (
              <WordResultControls
                sort={wordSort}
                onSortChange={setWordSort}
                filter={wordFilter}
                onFilterChange={setWordFilter}
                filterMode={wordFilterMode}
                onFilterModeChange={setWordFilterMode}
              />
            )}

            {showingWords
              ? hasResults && <WordList words={state.words} />
              : state.committedQuery && (
                  <InfiniteList
                    items={state.lines}
                    getKey={line => line.id}
                    renderItem={line => <ResultCard line={line} query={state.committedQuery} mode={searchMode} fuzzyLevel={fuzzy.level} />}
                    hasMore={hasMore}
                    loading={state.loadingMore}
                    error={state.loadMoreError}
                    onLoadMore={handleLoadMore}
                  />
                )}

            {!state.loading && state.committedQuery && !hasResults && !state.error && (
              searchMode === 'letterset'
                ? <NoResults message="No words match this letter set" />
                : <NoResults query={state.committedQuery} />
            )}

            {/* Line results load the next page as you scroll (InfiniteList).
                Word-scope results (hidden Letter Set / Pattern modes) keep the
                button until those modes come back. */}
            {showingWords && state.loadMoreError && !state.loading && (
              <ErrorNotice compact message={state.loadMoreError} onRetry={handleLoadMore} />
            )}

            {showingWords && hasMore && !state.loadMoreError && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  aria-busy={state.loading}
                  className={state.loading ? 'animate-pulse' : undefined}
                  style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', fontWeight: 500, cursor: state.loading ? 'default' : 'pointer', opacity: state.loading ? 0.7 : 1 }}
                >
                  {state.loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            {!state.committedQuery && (
              <ShabadFeed sources={filters.sources} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
