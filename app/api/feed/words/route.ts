import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decodeWordCursor, wordPage } from '@/lib/feed';
import { CDN_CACHE, NO_STORE } from '@/lib/cache';

export const runtime = 'nodejs';

// GET /api/feed/words?after=<cursor> — the next 20 words by occurrence count.
export async function GET(req: NextRequest) {
  const rawAfter = req.nextUrl.searchParams.get('after');
  const after = rawAfter ? decodeWordCursor(rawAfter) : null;
  if (rawAfter && !after) {
    return NextResponse.json({ error: 'bad cursor' }, { status: 400, headers: { 'Cache-Control': NO_STORE } });
  }

  try {
    const page = await wordPage(supabase, after);
    return NextResponse.json(page, { headers: { 'Cache-Control': CDN_CACHE } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503, headers: { 'Cache-Control': NO_STORE } });
  }
}
