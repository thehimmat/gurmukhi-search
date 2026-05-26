import { NextResponse } from 'next/server';
import { listRaags, listWriters } from '@/lib/search';

export const runtime = 'nodejs';

// Returns the list of available raags and writers for the filter dropdowns.
// Cached for 1 hour — these don't change unless the kosh DB is re-ingested.
export async function GET() {
  const [raags, writers] = await Promise.all([listRaags(), listWriters()]);
  return NextResponse.json({ raags, writers }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
