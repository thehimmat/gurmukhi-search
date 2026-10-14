import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decodeLineCursor, shabadPage } from '@/lib/feed';
import { CDN_CACHE, NO_STORE } from '@/lib/cache';

export const runtime = 'nodejs';

// GET /api/feed/shabads?source=1&source=3&after=<cursor>
// The next 20 shabads, in reading order, from the selected scriptures. No
// source means every scripture.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sources = sp.getAll('source').map(Number).filter(n => Number.isInteger(n) && n > 0);
  const rawAfter = sp.get('after');
  const after = rawAfter ? decodeLineCursor(rawAfter) : null;
  if (rawAfter && !after) {
    return NextResponse.json({ error: 'bad cursor' }, { status: 400, headers: { 'Cache-Control': NO_STORE } });
  }

  try {
    const page = await shabadPage(supabase, sources.length ? sources : undefined, after);
    return NextResponse.json(page, { headers: { 'Cache-Control': CDN_CACHE } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503, headers: { 'Cache-Control': NO_STORE } });
  }
}
