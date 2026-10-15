import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '@/test/fake-supabase';

const words = [
  { id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 9, in_corpus: true },
  { id: 2, gurmukhi: 'ਸਬਦਿ', frequency: 5, in_corpus: true },
];
const db = fakeSupabase({ words }, {
  search_words_fuzzy: () => [
    { id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 9, exact: true },
    { id: 3, gurmukhi: 'ਸ਼ਬਦੁ', frequency: 4, exact: false },
  ],
});
vi.mock('@/lib/supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { GET } = await import('./route');
const get = (qs: string) => GET(new NextRequest(`http://x/api/words?${qs}`));

beforeEach(() => { db.log.length = 0; db.rpcLog.length = 0; });

describe('/api/words', () => {
  it('matches the spelling by prefix when fuzzy is off', async () => {
    const body = await (await get('q=ਸਬਦ')).json();
    expect(db.rpcLog).toHaveLength(0);
    expect(body.words.map((w: { id: number }) => w.id)).toEqual([1, 2]);
  });

  it('uses search_words_fuzzy at the chosen level and marks variant spellings', async () => {
    const body = await (await get('q=ਸਬਦੁ&fuzzy=2')).json();
    expect(db.rpcLog[0]).toMatchObject({ fn: 'search_words_fuzzy', args: { p_query: 'ਸਬਦੁ', p_level: 2 } });
    expect(body.words).toEqual([
      { id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 9 },
      { id: 3, gurmukhi: 'ਸ਼ਬਦੁ', frequency: 4, match: 'fold' },
    ]);
  });

  it('is cacheable at the CDN', async () => {
    expect((await get('q=ਸਬਦ')).headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });
});
