import { NextResponse } from 'next/server';
import { listRaags, listWriters, listCorpora } from '@/lib/search';

export const runtime = 'nodejs';

// Options for the filter dropdowns: raags, writers and scriptures, each with a
// line count. Cached for 1 hour — they don't change unless kosh is re-ingested.
export async function GET() {
  const [raags, writers, corpora] = await Promise.all([listRaags(), listWriters(), listCorpora()]);
  return NextResponse.json({ raags, writers, corpora }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
