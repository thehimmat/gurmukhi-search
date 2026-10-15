import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/test/fake-supabase';

const row = (id: number) => ({
  id, verse_id: id, shabad_id: 1, ang: 1, line_no: id, gurmukhi: `g${id}`, translation_en: null,
  transliteration_en: null, raag_english: null, raag_gurmukhi: null, writer_english: null,
  writer_id: null, ang_start: 1, source_fk: 1, total_count: 42,
});
const db = fakeSupabase({ lines: [] }, {
  search_lines_fuzzy: a => Array.from({ length: Math.min(Number(a.p_limit), 21) }, (_, i) => row(i + 1)),
  search_first_letters_fuzzy: () => [row(1), row(2)],
});
vi.mock('./supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { searchContains, searchFirstLetters } = await import('./search');

beforeEach(() => { db.log.length = 0; db.rpcLog.length = 0; });

describe('fuzzy Contains', () => {
  it('asks search_lines_fuzzy for the level, one row past the page', async () => {
    const r = await searchContains('ਸਤੀਗੁਰ', { sources: [1, 3] }, 1, false, 2);
    expect(db.rpcLog[0]).toMatchObject({
      fn: 'search_lines_fuzzy',
      args: { p_query: 'ਸਤੀਗੁਰ', p_level: 2, p_sources: [1, 3], p_limit: 21, p_offset: 20 },
    });
    expect(r.lines).toHaveLength(20);
    expect(r.hasMore).toBe(true);
    expect(r.total).toBeNull();
  });

  it('stays on the exact substring query when fuzzy is off', async () => {
    await searchContains('ਸਤਿਗੁਰ', {}, 0, false, 0);
    expect(db.rpcLog).toHaveLength(0);
    expect(db.log[0].filters).toContain('gurmukhi like %ਸਤਿਗੁਰ%');
  });
});

describe('fuzzy First Letter', () => {
  it('asks search_first_letters_fuzzy with the letters and level', async () => {
    const r = await searchFirstLetters('ਸਨਕ', {}, 0, 3);
    expect(db.rpcLog[0]).toMatchObject({
      fn: 'search_first_letters_fuzzy',
      args: { p_letters: ['ਸ', 'ਨ', 'ਕ'], p_level: 3, p_limit: 20, p_offset: 0 },
    });
    expect(r.total).toBe(42);
  });
});
