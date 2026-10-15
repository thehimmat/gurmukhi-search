'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

// Rows from the end at which the next page starts loading, so it's usually in
// before the reader reaches the bottom.
const PREFETCH_ROWS = 3;

export function shouldLoadMore(
  lastRenderedIndex: number,
  count: number,
  s: { hasMore: boolean; loading: boolean; error: string | null },
): boolean {
  if (!s.hasMore || s.loading || s.error) return false;
  return lastRenderedIndex >= count - 1 - PREFETCH_ROWS;
}

// useLayoutEffect warns during server rendering; there's nothing to measure there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Props<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
  // First guess at a row's height; real heights are measured once rendered.
  estimateSize?: number;
  gap?: number;
};

// An endless list: only the rows near the viewport are in the DOM, however
// many pages have loaded, and the next page loads as the reader nears the end.
export function InfiniteList<T>({
  items, getKey, renderItem, hasMore, loading, error, onLoadMore, estimateSize = 160, gap = 12,
}: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Distance from the top of the document, which the window virtualizer
  // measures from. Re-measured when the page's layout changes (a panel opening
  // above the list resizes the body), not on every render: reading layout
  // forces the browser to compute it (#39).
  useIsoLayoutEffect(() => {
    const measure = () => {
      const el = listRef.current;
      if (el) setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(document.body);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimateSize,
    overscan: 4,
    gap,
    scrollMargin,
    getItemKey: i => getKey(items[i]),
  });
  const rows = virtualizer.getVirtualItems();
  const lastIndex = rows.at(-1)?.index ?? -1;

  useEffect(() => {
    if (shouldLoadMore(lastIndex, items.length, { hasMore, loading, error })) onLoadMore();
  }, [lastIndex, items.length, hasMore, loading, error, onLoadMore]);

  return (
    <div>
      <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {rows.map(row => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start - scrollMargin}px)` }}
          >
            {renderItem(items[row.index])}
          </div>
        ))}
      </div>

      {loading && (
        <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3" style={{ marginTop: items.length ? gap : 0 }}>
          <span className="sr-only">Loading more…</span>
          {[0, 1].map(i => (
            <div key={i} className="animate-pulse rounded-lg border border-[#ddd0be] bg-[#fdf9f3] p-4">
              <div className="h-5 w-2/3 rounded bg-[#efe3cf]" />
              <div className="mt-3 h-3 w-1/2 rounded bg-[#f3eadb]" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 text-center text-sm text-[#7a6045]" role="alert">
          Couldn&apos;t load more.{' '}
          <button type="button" onClick={onLoadMore} className="underline text-[#8b5e3c]">Try again</button>
        </div>
      )}
    </div>
  );
}
