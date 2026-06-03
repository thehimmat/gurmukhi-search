'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import ModeSelector from '@/components/ModeSelector';
import FilterPanel from '@/components/FilterPanel';
import ResultCard from '@/components/ResultCard';
import PatternHelp from '@/components/PatternHelp';
import { SearchFilters, LineWithMeta } from '@/lib/supabase';
import { PAGE_SIZE } from '@/lib/search';

type Mode = 'contains' | 'first_letter' | 'pattern';

type SearchState = {
  lines: LineWithMeta[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  committedQuery: string; // the query that produced these results
};

export default function Home() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>('contains');
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

  // Auto-run search when a ?q= param is present on initial load
  useEffect(() => {
    if (initialQuery.trim()) {
      runSearch(initialQuery, 'contains', {}, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(async (q: string, m: Mode, f: SearchFilters, page: number) => {
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
      ...(f.raag   ? { raag:    f.raag }                   : {}),
      ...(f.writer ? { writer:  f.writer }                  : {}),
      ...(f.angMin != null ? { ang_min: String(f.angMin) }  : {}),
      ...(f.angMax != null ? { ang_max: String(f.angMax) }  : {}),
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

  function handleSubmit() {
    runSearch(query, mode, filters, 0);
  }

  function handleLoadMore() {
    runSearch(state.committedQuery, mode, filters, state.page + 1);
  }

  // Re-run when filters change if a search has already been committed
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (state.committedQuery) {
      runSearch(state.committedQuery, mode, filtersRef.current, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const hasResults = state.lines.length > 0;
  const hasMore    = state.lines.length < state.total;
  const showed     = state.lines.length;
  const total      = state.total;

  return (
    <main className="min-h-screen bg-[#f5ede0]">
      <header className="bg-[#3d2b1f] text-[#f5ede0] py-6 px-4 shadow-md">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-3xl font-semibold mb-0.5"
            style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
          >
            ਗੁਰਬਾਣੀ ਖੋਜ
          </h1>
          <p className="text-sm text-[#c8b89a]" style={{ fontFamily: '"Crimson Pro", serif' }}>
            Gurbani Search — Sri Guru Granth Sahib Ji (1430 angs)
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <ModeSelector
          value={mode}
          onChange={m => {
            setMode(m);
            setState(s => ({ ...s, lines: [], total: 0, error: null, committedQuery: '' }));
          }}
        />

        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          mode={mode}
        />

        {mode === 'pattern' && <PatternHelp />}

        <FilterPanel
          filters={filters}
          onChange={setFilters}
          raags={raags}
          writers={writers}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {(hasResults || state.loading) && (
          <div className="flex items-center justify-between mb-3 text-sm text-[#7a6045]">
            {hasResults && (
              <span>
                Showing <strong>{showed}</strong> of{' '}
                <strong>{total.toLocaleString()}</strong> result{total !== 1 ? 's' : ''}
              </span>
            )}
            {state.loading && <span className="text-[#8b5e3c] animate-pulse">Searching…</span>}
          </div>
        )}

        {state.error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <div className="space-y-3">
          {state.lines.map(line => (
            <ResultCard
              key={line.id}
              line={line}
              query={state.committedQuery}
              mode={mode}
            />
          ))}
        </div>

        {!state.loading && state.committedQuery && !hasResults && !state.error && (
          <div className="text-center py-16 text-[#a0896a]">
            <p className="text-4xl mb-3" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>
              ਕੁਝ ਨਹੀਂ ਮਿਲਿਆ
            </p>
            <p className="text-sm">No results for &ldquo;{state.committedQuery}&rdquo;</p>
          </div>
        )}

        {hasMore && !state.loading && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2.5 bg-[#8b5e3c] text-[#fdf6ec] rounded-lg font-medium
                         hover:bg-[#6d4a2d] transition-colors"
            >
              Load {Math.min(PAGE_SIZE, total - showed)} more
              <span className="ml-1 text-[#c8b89a] text-xs">
                ({(total - showed).toLocaleString()} remaining)
              </span>
            </button>
          </div>
        )}

        {state.loading && hasResults && (
          <div className="mt-6 text-center text-sm text-[#8b5e3c] animate-pulse">
            Loading more…
          </div>
        )}

        {!state.committedQuery && !state.loading && (
          <div className="text-center py-20 text-[#c8b09a]">
            <p className="text-6xl mb-4 opacity-20" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>
              ੴ
            </p>
            <p className="text-sm">
              Enter a search above. Paste Gurmukhi Unicode, or enable phonetic mode and type roman letters.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
