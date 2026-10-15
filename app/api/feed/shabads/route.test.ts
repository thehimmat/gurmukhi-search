import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '@/test/fake-supabase';

// SGGS: 25 two-line shabads over angs 1-13; Dasam: 5; Bhai Gurdas: 3.
const lines: Record<string, unknown>[] = [];
let id = 0;
function corpus(source: number, rank: number, shabadBase: number, shabads: number) {
  for (let s = 0; s < shabads; s++) for (let k = 0; k < 2; k++) {
    id++;
    lines.push({ id, verse_id: id, source_fk: source, corpus_rank: rank, shabad_id: shabadBase + s,
      ang: 1 + Math.floor(s / 2), line_no: (s % 2) * 2 + k + 1, gurmukhi: `g${id}`,
      translation_en: null, transliteration_en: null, shabads: null });
  }
}
corpus(1, 0, 1, 25);
corpus(3, 10, 1001, 5);
corpus(2, 30, 2001, 3);

const db = fakeSupabase({ lines });
vi.mock('@/lib/supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { GET } = await import('./route');

const get = async (qs: string) => {
  const res = await GET(new NextRequest(`http://x/api/feed/shabads?${qs}`));
  return { res, body: await res.json() };
};
const shabadIds = (body: { shabads: { lines: { shabad_id: number }[] }[] }) =>
  body.shabads.map(s => s.lines[0].shabad_id);

beforeEach(() => { db.log.length = 0; });

describe('/api/feed/shabads', () => {
  it('starts at the first 20 shabads of the first selected scripture', async () => {
    const { body } = await get('source=1&source=3');
    expect(shabadIds(body)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(body.next).toBeTruthy();
  });

  it('continues from the cursor into the next selected scripture, in reading order', async () => {
    const first = await get('source=1&source=3');
    const { body } = await get(`source=1&source=3&after=${first.body.next}`);
    expect(shabadIds(body)).toEqual([21, 22, 23, 24, 25, 1001, 1002, 1003, 1004, 1005]);
    expect(body.next).toBeNull();
  });

  it('starts with Dasam when only Dasam is selected', async () => {
    const { body } = await get('source=3');
    expect(shabadIds(body)).toEqual([1001, 1002, 1003, 1004, 1005]);
  });

  it('never re-reads earlier scripture: every query is bounded by the cursor', async () => {
    const first = await get('source=1');
    db.log.length = 0;
    await get(`source=1&after=${first.body.next}`);
    for (const q of db.log) expect(q.filters.some(f => /corpus_rank(=|>)/.test(f))).toBe(true);
  });

  it('is cacheable at the CDN', async () => {
    const { res } = await get('source=1');
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });

  it('rejects a malformed cursor', async () => {
    const { res } = await get('source=1&after=nope');
    expect(res.status).toBe(400);
  });
});
