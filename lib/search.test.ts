import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/test/fake-supabase';

const row = (id: number) => ({
  id, verse_id: id, shabad_id: 1, ang: 1, line_no: id, gurmukhi: `g${id}`, translation_en: null,
  transliteration_en: null, raag_english: null, raag_gurmukhi: null, writer_english: null,
  writer_id: null, ang_start: 1, source_fk: 1,
});
// 25 matching lines in all, paged by the RPC's own limit and offset.
const db = fakeSupabase({ lines: [] }, {
  search_lines_contains: a =>
    Array.from({ length: 25 }, (_, i) => row(i + 1)).slice(Number(a.p_offset), Number(a.p_offset) + Number(a.p_limit)),
  count_lines_contains: () => [25] as unknown[],
});
vi.mock('./supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { searchContains } = await import('./search');

beforeEach(() => { db.log.length = 0; db.rpcLog.length = 0; });

describe('searchContains', () => {
  // kosh 066 matches on the canonical spelling, so nukta letters and
  // mark-only queries (੍, ਼, "੍ ") behave; the shell sends the query as typed.
  it('asks search_lines_contains for the query as typed, with the filters', async () => {
    await searchContains('੍ ', { sources: [1, 3] }, 1);
    expect(db.rpcLog[0]).toMatchObject({
      fn: 'search_lines_contains',
      args: { p_query: '੍ ', p_sources: [1, 3], p_limit: 21, p_offset: 20 },
    });
  });

  it('counts every match on the first page, in parallel with the rows', async () => {
    const r = await searchContains('ਸਤਿ', { writers: ['Guru Nanak Dev Ji'] }, 0);
    expect(db.rpcLog.map(c => c.fn).sort()).toEqual(['count_lines_contains', 'search_lines_contains']);
    expect(db.rpcLog.find(c => c.fn === 'count_lines_contains')?.args)
      .toMatchObject({ p_query: 'ਸਤਿ', p_writers: ['Guru Nanak Dev Ji'] });
    expect(r.total).toBe(25);
  });

  it('leaves the count to page 0 on later pages', async () => {
    const r = await searchContains('ੴ', {}, 1);
    expect(db.rpcLog.some(c => c.fn === 'count_lines_contains')).toBe(false);
    expect(r.total).toBeNull();
  });

  it('pages by one extra row', async () => {
    const first = await searchContains('ੴ', {}, 0);
    expect(first.lines).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    const second = await searchContains('ੴ', {}, 1);
    expect(second.lines.map(l => l.id)).toEqual([21, 22, 23, 24, 25]);
    expect(second.hasMore).toBe(false);
  });

  it('reshapes the flat rows for the line components', async () => {
    const r = await searchContains('ੴ', {}, 1);
    expect(r.lines[0]).toMatchObject({ id: 21, gurmukhi: 'g21', shabads: null });
  });
});
