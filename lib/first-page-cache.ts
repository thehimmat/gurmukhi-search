import { unstable_cache } from 'next/cache';

// The first page of a search (its total and first 20 rows) is what every
// visitor sees, and the broad queries (one starting letter, thousands of
// matches) are both the slowest and the most repeated. The CDN already caches
// each response, but per region; this keeps page 0 in Next's data cache, which
// Vercel shares across regions (#34). Later pages stay CDN-only.
//
// `key` must identify the search completely. A result that should not be
// kept (an error) is thrown out of `run`, so it is never cached.
const DAY = 86400;

export async function cachedFirstPage<T>(key: string, run: () => Promise<T>): Promise<T> {
  try {
    return await unstable_cache(run, ['search-first-page', key], { revalidate: DAY })();
  } catch (e) {
    // Outside a Next server (tests, scripts) there is no data cache.
    if ((e as Error).message?.startsWith('Invariant: incrementalCache missing')) return run();
    throw e;
  }
}

// The query string with `page` dropped and params sorted, so the same search
// is one cache entry however its URL was assembled.
export function firstPageKey(sp: URLSearchParams): string {
  const entries = [...sp.entries()].filter(([k]) => k !== 'page' && k !== '_rsc');
  entries.sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0));
  return new URLSearchParams(entries).toString();
}
