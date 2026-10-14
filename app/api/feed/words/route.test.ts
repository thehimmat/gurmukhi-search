import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '@/test/fake-supabase';

// 45 words; frequencies tie in threes so the cursor has to break ties by id.
const words = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1, gurmukhi: `w${i + 1}`, frequency: 100 - Math.floor(i / 3), in_corpus: true,
}));
words.push({ id: 999, gurmukhi: 'not-in-corpus', frequency: 1000, in_corpus: false });

const db = fakeSupabase({ words });
vi.mock('@/lib/supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { GET } = await import('./route');

const get = async (qs = '') => {
  const res = await GET(new NextRequest(`http://x/api/feed/words?${qs}`));
  return { res, body: await res.json() };
};

describe('/api/feed/words', () => {
  it('pages every corpus word exactly once, most frequent first', async () => {
    const seen: number[] = [];
    let next: string | null = '';
    do {
      const { body } = await get(next ? `after=${next}` : '');
      seen.push(...body.words.map((w: { id: number }) => w.id));
      next = body.next;
    } while (next);
    expect(seen).toEqual(words.filter(w => w.in_corpus).map(w => w.id));
  });

  it('returns 20 per page and is cacheable', async () => {
    const { res, body } = await get();
    expect(body.words).toHaveLength(20);
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });
});
