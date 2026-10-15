import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CDN_CACHE } from '@/lib/cache';
import { parseFuzzyLevel } from '@/lib/fuzzy';

type WordHit = { id: number; gurmukhi: string; frequency: number; match?: 'fold' };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);
  const fuzzy = parseFuzzyLevel(req.nextUrl.searchParams.get('fuzzy'));

  if (!q) return NextResponse.json({ words: [] }, { headers: { 'Cache-Control': CDN_CACHE } });

  // Fuzzy (kosh 047): prefix on the folded spelling, exact spellings first.
  // Variant spellings are marked so the UI can label them.
  if (fuzzy > 0) {
    const { data, error } = await supabase.rpc('search_words_fuzzy', { p_query: q, p_level: fuzzy, p_limit: limit });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const words: WordHit[] = ((data ?? []) as Array<WordHit & { exact: boolean }>).map(({ exact, ...w }) =>
      exact ? w : { ...w, match: 'fold' as const });
    return NextResponse.json({ words }, { headers: { 'Cache-Control': CDN_CACHE } });
  }

  // Exact prefix match first
  const { data, error } = await supabase
    .from('words')
    .select('id, gurmukhi, frequency')
    .ilike('gurmukhi', `${q}%`)
    .order('frequency', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fallback: substring match
  if (!data || data.length === 0) {
    const { data: substring, error: substringErr } = await supabase
      .from('words')
      .select('id, gurmukhi, frequency')
      .ilike('gurmukhi', `%${q}%`)
      .order('frequency', { ascending: false })
      .limit(limit);

    if (substringErr) return NextResponse.json({ error: substringErr.message }, { status: 500 });
    return NextResponse.json({ words: substring ?? [] }, { headers: { 'Cache-Control': CDN_CACHE } });
  }

  return NextResponse.json({ words: data }, { headers: { 'Cache-Control': CDN_CACHE } });
}
