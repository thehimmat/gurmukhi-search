'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import ModeSelector from '@/components/ModeSelector';
import FilterPanel from '@/components/FilterPanel';
import ResultCard from '@/components/ResultCard';
import PatternHelp from '@/components/PatternHelp';
import { SearchFilters, LineWithMeta, Word } from '@/lib/supabase';
import { PAGE_SIZE } from '@/lib/search';

type SearchMode = 'contains' | 'first_letter' | 'pattern';
type AppMode = 'gurbani' | 'kosh';

type SearchState = {
  lines: LineWithMeta[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  committedQuery: string;
};

export default function Home() {
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

function KoshSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/words?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.words ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (results[0]) router.push(`/word/${encodeURIComponent(results[0].gurmukhi)}`);
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
          className="gurmukhi"
          value={query}
          onChange={e => setQuery(e.target.value)}
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

      {loading && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', padding: '0.5rem 0.25rem' }}>
          Searching…
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
                <span className="badge" title="occurrences in SGGS">{word.frequency.toLocaleString()}×</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {!loading && query && results.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif', fontSize: '0.9rem', padding: '1rem 0.25rem' }}>
          No words found for &ldquo;{query}&rdquo;
        </p>
      )}

      {!query && (
        <p style={{ color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', marginTop: '1rem' }}>
          Type Gurmukhi text directly, or <a href="/browse">browse by frequency</a>.
        </p>
      )}
    </div>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const initialMode = (searchParams.get('mode') as AppMode) ?? 'gurbani';

  const [appMode, setAppMode] = useState<AppMode>(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>('contains');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [raags, setRaags] = useState<string[]>([]);
  const [writers, setWriters] = useState<string[]>([]);
  const [state, setState] = useState<SearchState>({
    lines: [],
    total: 0,
    page: 0,
    loading: false,
    error: null,
    committedQuery: '',
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/meta')
      .then(r => r.json())
      .then(({ raags, writers }: { raags: string[]; writers: string[] }) => {
        setRaags(raags);
        setWriters(writers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialQuery.trim() && appMode === 'gurbani') {
      runSearch(initialQuery, 'contains', {}, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(async (q: string, m: SearchMode, f: SearchFilters, page: number) => {
    if (!q.trim()) {
      setState(s => ({ ...s, lines: [], total: 0, error: null, loading: false, committedQuery: '' }));
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState(s => ({
      ...s,
      loading: true,
      error: null,
      ...(page === 0 ? { lines: [], total: 0 } : {}),
    }));

    const params = new URLSearchParams({
      q, mode: m, page: String(page),
      ...(f.raag   ? { raag:    f.raag }                  : {}),
      ...(f.writer ? { writer:  f.writer }                 : {}),
      ...(f.angMin != null ? { ang_min: String(f.angMin) } : {}),
      ...(f.angMax != null ? { ang_max: String(f.angMax) } : {}),
    });

    try {
      const res = await fetch(`/api/search?${params}`, { signal: ctrl.signal });
      const json = await res.json();

      if (!res.ok) {
        setState(s => ({ ...s, loading: false, error: json.error ?? 'Search failed' }));
        return;
      }

      setState(s => ({
        loading: false,
        error: null,
        total: json.total,
        page,
        committedQuery: q,
        lines: page === 0 ? json.lines : [...s.lines, ...json.lines],
      }));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setState(s => ({ ...s, loading: false, error: 'Search failed' }));
      }
    }
  }, []);

  function handleSubmit() { runSearch(query, searchMode, filters, 0); }
  function handleLoadMore() { runSearch(state.committedQuery, searchMode, filters, state.page + 1); }

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (state.committedQuery) {
      runSearch(state.committedQuery, searchMode, filtersRef.current, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const hasResults = state.lines.length > 0;
  const hasMore    = state.lines.length < state.total;
  const showed     = state.lines.length;
  const total      = state.total;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>

      {/* Segmented control bar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'white', padding: '0.75rem 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <SegmentedControl value={appMode} onChange={setAppMode} />
        </div>
      </div>

      {/* Kosh mode */}
      {appMode === 'kosh' && <KoshSearch />}

      {/* Gurbani search mode */}
      {appMode === 'gurbani' && (
        <>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
            <ModeSelector
              value={searchMode}
              onChange={m => {
                setSearchMode(m);
                setState(s => ({ ...s, lines: [], total: 0, error: null, committedQuery: '' }));
              }}
            />
          </div>

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1.5rem 0' }}>
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              mode={searchMode}
            />
          </div>

          {searchMode === 'pattern' && (
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.5rem' }}>
              <PatternHelp />
            </div>
          )}

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem 1.5rem' }}>
            <FilterPanel filters={filters} onChange={setFilters} raags={raags} writers={writers} />
          </div>

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem 1.5rem 3rem' }}>
            {(hasResults || state.loading) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif' }}>
                {hasResults && (
                  <span>Showing <strong>{showed}</strong> of <strong>{total.toLocaleString()}</strong> result{total !== 1 ? 's' : ''}</span>
                )}
                {state.loading && <span style={{ color: 'var(--accent)' }} className="animate-pulse">Searching…</span>}
              </div>
            )}

            {state.error && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem', fontFamily: '"Inter", sans-serif' }}>
                {state.error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {state.lines.map(line => (
                <ResultCard key={line.id} line={line} query={state.committedQuery} mode={searchMode} />
              ))}
            </div>

            {!state.loading && state.committedQuery && !hasResults && !state.error && (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                <p className="gurmukhi" style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>ਕੁਝ ਨਹੀਂ ਮਿਲਿਆ</p>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.875rem' }}>No results for &ldquo;{state.committedQuery}&rdquo;</p>
              </div>
            )}

            {hasMore && !state.loading && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  onClick={handleLoadMore}
                  style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Load {Math.min(PAGE_SIZE, total - showed)} more
                  <span style={{ marginLeft: '0.4rem', opacity: 0.7, fontSize: '0.8rem' }}>({(total - showed).toLocaleString()} remaining)</span>
                </button>
              </div>
            )}

            {state.loading && hasResults && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', color: 'var(--accent)' }} className="animate-pulse">
                Loading more…
              </div>
            )}

            {!state.committedQuery && !state.loading && (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
                <p className="gurmukhi" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.15 }}>ੴ</p>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.875rem' }}>
                  Enter a search above. Paste Gurmukhi Unicode, or enable phonetic mode and type roman letters.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
