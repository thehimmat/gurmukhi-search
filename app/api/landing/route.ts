import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONCEPTS, LANDING_WORDS, MOOL_MANTAR, withCounts } from '@/lib/landing';

export const runtime = 'nodejs';

// Occurrence counts for the pre-search showcase. Cached for an hour like
// /api/meta (counts only change on re-ingest); a failure is never cached.
export async function GET() {
  const { data, error } = await supabase
    .from('words')
    .select('gurmukhi, frequency')
    .in('gurmukhi', LANDING_WORDS);

  if (error || !data?.length) {
    return NextResponse.json(
      { error: error?.message ?? 'no rows' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { moolMantar: withCounts(MOOL_MANTAR, data), concepts: withCounts(CONCEPTS, data) },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
