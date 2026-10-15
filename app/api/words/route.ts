import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CDN_CACHE } from '@/lib/cache';
import { parseFuzzyLevel } from '@/lib/fuzzy';
import { escapeLike } from '@/lib/like';

type WordHit = { id: number; gurmukhi: string; frequency: number; match?: 'fold' };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20), 50);
  const fuzzy = parseFuzzyLevel(req.nextUrl.searchParams.get('fuzzy'));

  if (!q) return NextResponse.json({ words: [] }, { headers: { 'Cache-Control': CDN_CACHE } });

  // Scripture / Writer filters (kosh 052): words attested in the selection,
  // most frequent within it, with that in-selection frequency.
  const sp = req.nextUrl.searchParams;
  const sources = sp.getAll('source').map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
  const writers = sp.getAll('writer').map((v) => v.trim()).filter(Boolean);
  if (sources.length || writers.length) {
    const { data, error } = await supabase.rpc('search_words_filtered', {
      p_query: q,
      p_level: fuzzy,
      p_sources: sources.length ? sources : null,
      p_writers: writers.length ? writers : null,
      p_limit: limit,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const words: WordHit[] = ((data ?? []) as Array<WordHit & { exact: boolean }>).map(({ exact, ...w }) =>
      exact || !fuzzy ? w : { ...w, match: 'fold' as const });
    return NextResponse.json({ words }, { headers: { 'Cache-Control': CDN_CACHE } });
  }

  // Fuzzy (kosh 047): prefix on the folded spelling, exact spellings first.
  // Variant spellings are marked so the UI can label them.
  if (fuzzy > 0) {
    const { data, error } = await supabase.rpc('search_words_fuzzy', { p_query: q, p_level: fuzzy, p_limit: limit });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const words: WordHit[] = ((data ?? []) as Array<WordHit & { exact: boolean }>).map(({ exact, ...w }) =>
      exact ? w : { ...w, match: 'fold' as const });
    return NextResponse.json({ words }, { headers: { 'Cache-Control': CDN_CACHE } });
  }

  // Prefix match first, then substring. Corpus words only, as the feeds and
  // the fuzzy path list them; `like`, not `ilike` (Gurmukhi has no case); and
  // the user's % and _ are text, not wildcards.
  const q_ = escapeLike(q);
  const lookup = (pattern: string) => supabase
    .from('words')
    .select('id, gurmukhi, frequency')
    .eq('in_corpus', true)
    .like('gurmukhi', pattern)
    .order('frequency', { ascending: false })
    .limit(limit);

  const { data, error } = await lookup(`${q_}%`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    const { data: substring, error: substringErr } = await lookup(`%${q_}%`);
    if (substringErr) return NextResponse.json({ error: substringErr.message }, { status: 500 });
    return NextResponse.json({ words: substring ?? [] }, { headers: { 'Cache-Control': CDN_CACHE } });
  }

  return NextResponse.json({ words: data }, { headers: { 'Cache-Control': CDN_CACHE } });
}
