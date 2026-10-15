// gurmukhi-search#46: line_no is the printed line, and one printed line holds
// several verses, so a shabad can end and the next begin on the same line_no
// (SGGS ang 2: verse 30 ends shabad 3, verses 31-32 open shabad 4, all on
// line 3). Paging must still return every line of every shabad, once.
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '@/test/fake-supabase';

// 45 three-line shabads on SGGS, every shabad sharing its printed lines with
// its neighbours: each printed line holds 3 verses, so page 1 (20 shabads,
// ending at verse 60) stops mid printed line.
const lines: Record<string, unknown>[] = [];
for (let s = 0; s < 45; s++) for (let k = 0; k < 3; k++) {
  const id = lines.length + 1;
  lines.push({ id, verse_id: id, source_fk: 1, corpus_rank: 0, shabad_id: s + 1,
    ang: 1 + Math.floor((id - 1) / 40), line_no: 1 + Math.floor(((id - 1) % 40) / 3),
    gurmukhi: `g${id}`, translation_en: null, transliteration_en: null, shabads: null });
}

const db = fakeSupabase({ lines });
vi.mock('@/lib/supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { GET } = await import('./route');

describe('/api/feed/shabads across shared printed lines', () => {
  it('returns every line of every shabad exactly once', async () => {
    const seen: number[] = [];
    let next: string | null = '';
    for (let guard = 0; next !== null && guard < 10; guard++) {
      const res = await GET(new NextRequest(`http://x/api/feed/shabads?source=1${next ? `&after=${next}` : ''}`));
      const body = await res.json();
      for (const s of body.shabads) for (const l of s.lines) seen.push(l.id);
      next = body.next;
    }
    expect(seen).toEqual(lines.map(l => l.id));
  });
});
