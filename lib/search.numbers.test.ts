import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/test/fake-supabase';

const roles = [
  { role: 'author', line_count: 0 },
  { role: 'ghar', line_count: 0 },
  { role: 'heading_other', line_count: 2 },
  { role: 'verse_marker', line_count: 563 },
];
const db = fakeSupabase({}, {
  search_number_lines: () => [],
  count_number_roles: () => roles,
});
vi.mock('./supabase', async (orig) => ({ ...(await orig<object>()), supabase: db.client }));
const { searchNumbers } = await import('./search');

beforeEach(() => { db.rpcLog.length = 0; });

describe('searchNumbers role counts', () => {
  it('scopes the role counts to the same filters as the results', async () => {
    const r = await searchNumbers(1, { sources: [3], writers: ['Guru Gobind Singh Ji'] }, 0);
    expect(db.rpcLog.find(c => c.fn === 'count_number_roles')?.args).toMatchObject({
      p_value: 1, p_sources: [3], p_writers: ['Guru Gobind Singh Ji'],
    });
    expect(r.numberRoles?.find(x => x.role === 'verse_marker')?.lineCount).toBe(563);
  });

  it('fetches the counts on the first page only', async () => {
    const r = await searchNumbers(1, {}, 2);
    expect(db.rpcLog.map(c => c.fn)).toEqual(['search_number_lines']);
    expect(r.numberRoles).toBeUndefined();
  });

  it('still labels the boxes when every role is unticked', async () => {
    const r = await searchNumbers(1, { numberRoles: [] }, 0);
    expect(r.lines).toEqual([]);
    expect(r.numberRoles).toHaveLength(4);
  });
});
