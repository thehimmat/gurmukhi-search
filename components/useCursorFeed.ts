'use client';

import { useCallback, useRef, useState } from 'react';

type Page = { next: string | null; error?: string } & Record<string, unknown>;

type FeedState<T> = {
  url: string;
  items: T[];
  next: string | null;
  done: boolean;
  loading: boolean;
  error: string | null;
};

const fresh = <T,>(url: string): FeedState<T> =>
  ({ url, items: [], next: null, done: false, loading: false, error: null });

// Pages through a cursor-feed endpoint. `url` is the first page's URL; each
// later page appends `after=<cursor>`. A new `url` (e.g. a different scripture
// selection) starts over in the same render, so nothing reads the old cursor,
// and a response for an old url is dropped.
export function useCursorFeed<T>(
  url: string,
  pick: (page: Page) => T[],
  merge: (existing: T[], incoming: T[]) => T[] = (a, b) => [...a, ...b],
) {
  const [state, setState] = useState<FeedState<T>>(() => fresh(url));
  const current = state.url === url ? state : fresh<T>(url);
  if (state.url !== url) setState(current);

  const ctrlRef = useRef<AbortController | null>(null);
  const pickRef = useRef(pick); pickRef.current = pick;
  const mergeRef = useRef(merge); mergeRef.current = merge;

  const { next, done } = current;
  const loadMore = useCallback(async () => {
    if (done) return;
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const update = (f: (s: FeedState<T>) => Partial<FeedState<T>>) =>
      setState(s => (s.url === url ? { ...s, ...f(s) } : s));

    update(() => ({ loading: true, error: null }));
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(next ? `${url}${sep}after=${encodeURIComponent(next)}` : url, { signal: ctrl.signal });
      const page = (await res.json()) as Page;
      if (!res.ok) throw new Error(page.error ?? `HTTP ${res.status}`);
      update(s => ({
        items: mergeRef.current(s.items, pickRef.current(page)),
        next: page.next,
        done: page.next === null,
        loading: false,
      }));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      update(() => ({ error: (e as Error).message || 'Failed to load', loading: false }));
    }
  }, [url, next, done]);

  return { items: current.items, loading: current.loading, error: current.error, hasMore: !current.done, loadMore };
}
