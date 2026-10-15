import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '@/test/fake-supabase';

const words = [
  { id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 9, in_corpus: true },
  { id: 2, gurmukhi: 'ਸਬਦਿ', frequency: 5, in_corpus: true },
  { id: 4, gurmukhi: 'ਸਬਦਾਂ', frequency: 0, in_corpus: false },
  { id: 5, gurmukhi: 'ਸ%ਦ', frequency: 1, in_corpus: true },
];
const db = fakeSupabase({ words }, {
  search_words_filtered: () => [
    { id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 6, exact: true },
    { id: 3, gurmukhi: 'ਸ਼ਬਦੁ', frequency: 2, exact: false },
  ],
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

  it('leaves out dictionary head-words the corpus never uses', async () => {
    const body = await (await get('q=ਸਬਦ')).json();
    expect(body.words.map((w: { id: number }) => w.id)).not.toContain(4);
  });

  it('treats % and _ in the query as text', async () => {
    const body = await (await get('q=ਸ%')).json();
    expect(body.words.map((w: { id: number }) => w.id)).toEqual([5]);
    expect(db.log[0].filters.join(' ')).toContain('like ਸ\\%%');
  });

  it('falls back to 20 for a limit that is not a number', async () => {
    await get('q=ਸਬਦ&limit=abc');
    expect(db.log[0].limit).toBe(20);
  });

  it('searches within the selected scriptures and writers', async () => {
    const body = await (await get('q=ਸਬਦ&source=1&source=3&writer=Guru%20Arjan%20Dev%20Ji')).json();
    expect(db.rpcLog[0]).toMatchObject({
      fn: 'search_words_filtered',
      args: { p_query: 'ਸਬਦ', p_level: 0, p_sources: [1, 3], p_writers: ['Guru Arjan Dev Ji'], p_limit: 20 },
    });
    // Frequency is the count inside the selection; exact spellings aren't marked.
    expect(body.words[0]).toEqual({ id: 1, gurmukhi: 'ਸਬਦੁ', frequency: 6 });
  });

  it('marks variant spellings when a filtered search is fuzzy', async () => {
    const body = await (await get('q=ਸਬਦ&source=1&fuzzy=2')).json();
    expect(db.rpcLog[0].args).toMatchObject({ p_level: 2, p_sources: [1], p_writers: null });
    expect(body.words[1]).toEqual({ id: 3, gurmukhi: 'ਸ਼ਬਦੁ', frequency: 2, match: 'fold' });
  });

  it('is cacheable at the CDN', async () => {
    expect((await get('q=ਸਬਦ')).headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });
});
