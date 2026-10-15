import { NextResponse } from 'next/server';
import { listRaags, listWriters, listCorpora } from '@/lib/search';
import { CDN_CACHE, NO_STORE } from '@/lib/cache';

export const runtime = 'nodejs';

// Options for the filter dropdowns: raags, writers and scriptures, each with a
// line count. Cached at the CDN like search results (lib/cache.ts) — they only
// change when kosh is re-ingested. A browser-only max-age (as before) made
// every new visitor run all three facet queries (#38).
//
// A failed or empty result is NEVER cached. The facet queries used to swallow
// their errors and return [], and one transient failure (a PostgREST schema
// reload right after a deploy) got its empty payload cached at the edge for the
// full hour, leaving every filter dropdown blank long after the DB was healthy.
export async function GET() {
  try {
    const [raags, writers, corpora] = await Promise.all([
      listRaags(),
      listWriters(),
      listCorpora(),
    ]);

    if (!raags.length || !writers.length || !corpora.length) {
      return NextResponse.json(
        { raags, writers, corpora, error: 'incomplete facet lists' },
        { status: 503, headers: { 'Cache-Control': NO_STORE } },
      );
    }

    return NextResponse.json({ raags, writers, corpora }, {
      headers: { 'Cache-Control': CDN_CACHE },
    });
  } catch (e) {
    return NextResponse.json(
      { raags: [], writers: [], corpora: [], error: (e as Error).message },
      { status: 503, headers: { 'Cache-Control': NO_STORE } },
    );
  }
}
