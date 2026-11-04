// The line above a result list, and what shows when a search finds nothing.

import type { ReactNode } from 'react';

const plural = (n: number) => (n === 1 ? 'result' : 'results');

export function ResultCount({ showed, total, hasMore, capped = false }: {
  showed: number; total: number | null; hasMore: boolean;
  // The count stopped at its cap, so `total` is a lower bound.
  capped?: boolean;
}) {
  if (total !== null) {
    return <span>Showing <strong>{showed}</strong> of <strong>{total.toLocaleString('en-US')}{capped ? '+' : ''}</strong> {plural(total)}</span>;
  }
  // No exact total (the count failed or hit its cap): say there are more.
  return <span>Showing <strong>{showed}{hasMore ? '+' : ''}</strong> {plural(hasMore ? 2 : showed)}</span>;
}

export function NoResults({ query, message }: { query?: string; message?: string }) {
  return (
    <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontFamily: '"Inter", sans-serif', fontSize: '0.9rem' }}>
      {message ?? <>No results for &ldquo;{query}&rdquo;</>}
    </p>
  );
}

// Announces "Searching…" and the result count to screen readers. It stays
// mounted while empty, since a live region that appears with its text is
// often not read.
export function SearchStatus({ children }: { children?: ReactNode }) {
  return <div role="status" aria-live="polite">{children}</div>;
}
