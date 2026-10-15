import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/test/fake-supabase';

const lines = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1, verse_id: i + 1, shabad_id: 1, source_fk: 1, corpus_rank: 0, ang: 1, line_no: i + 1,
  gurmukhi: i % 2 ? 'ਸਤਿ ਨਾਮੁ ੴ' : 'ਹੋਰ ੴ', translation_en: null, transliteration_en: null, shabads: null,
}));
const db = fakeSupabase({ lines });
vi.mock('./supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { searchContains } = await import('./search');

beforeEach(() => { db.log.length = 0; });

describe('searchContains', () => {
  it('counts every match on the first page, in parallel with the rows', async () => {
    const r = await searchContains('ਸਤਿ', {}, 0);
    expect(db.log.filter(q => q.head)).toHaveLength(1);
    expect(r.total).toBe(12);
    expect(r.lines).toHaveLength(12);
    expect(r.hasMore).toBe(false);
  });

  it('leaves the count to page 0 on later pages', async () => {
    const r = await searchContains('ੴ', {}, 1);
    expect(db.log.some(q => q.head)).toBe(false);
    expect(r.total).toBeNull();
  });

  it('pages by one extra row', async () => {
    const first = await searchContains('ੴ', {}, 0); // all 25 lines match
    expect(first.lines).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(db.log.find(q => !q.head)?.limit).toBe(21);
    const second = await searchContains('ੴ', {}, 1);
    expect(second.lines.map(l => l.id)).toEqual([21, 22, 23, 24, 25]);
    expect(second.hasMore).toBe(false);
  });

  it('matches case-sensitively with like (Gurmukhi has no case)', async () => {
    await searchContains('ਸਤਿ', {}, 0);
    expect(db.log[0].filters).toContain('gurmukhi like %ਸਤਿ%');
  });
});
