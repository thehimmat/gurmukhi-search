import { NextResponse } from 'next/server';
import { listRaags, listWriters, listCorpora } from '@/lib/search';

export const runtime = 'nodejs';

// Options for the filter dropdowns: raags, writers and scriptures, each with a
// line count. Cached for an hour — they only change when kosh is re-ingested.
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
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json({ raags, writers, corpora }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e) {
    return NextResponse.json(
      { raags: [], writers: [], corpora: [], error: (e as Error).message },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
