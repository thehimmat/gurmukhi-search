import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { foldGurmukhi } from '@/lib/gurmukhi-fold';

type WordHit = { id: number; gurmukhi: string; frequency: number; match?: 'fold' };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);
  const fuzzy = req.nextUrl.searchParams.get('fuzzy') === '1';

  if (!q) return NextResponse.json({ words: [] });

  // Exact prefix match first
  const { data, error } = await supabase
    .from('words')
    .select('id, gurmukhi, frequency')
    .ilike('gurmukhi', `${q}%`)
    .order('frequency', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hits: WordHit[] = [...(data ?? [])];

  // Fuzzy: prefix on the folded spelling key (gurmukhi-kosh#63), ranked after
  // the exact hits and marked so the UI can tell them apart.
  if (fuzzy && hits.length < limit) {
    const folded = foldGurmukhi(q);
    if (folded) {
      const { data: foldHits } = await supabase
        .from('words')
        .select('id, gurmukhi, frequency')
        .like('search_fold', `${folded}%`)
        .order('frequency', { ascending: false })
        .limit(limit);
      const seen = new Set(hits.map(h => h.id));
      for (const w of foldHits ?? []) {
        if (hits.length >= limit) break;
        if (!seen.has(w.id)) hits.push({ ...w, match: 'fold' });
      }
    }
  }

  // Fallback: substring match
  if (hits.length === 0) {
    const { data: substring, error: substringErr } = await supabase
      .from('words')
      .select('id, gurmukhi, frequency')
      .ilike('gurmukhi', `%${q}%`)
      .order('frequency', { ascending: false })
      .limit(limit);

    if (substringErr) return NextResponse.json({ error: substringErr.message }, { status: 500 });
    return NextResponse.json({ words: substring ?? [] });
  }

  return NextResponse.json({ words: hits });
}
