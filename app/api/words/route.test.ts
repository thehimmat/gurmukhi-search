import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Records each words query and answers from a canned table keyed by the
// (column, operator) pair it filtered on.
const calls: Array<{ op: string; col: string; val: string }> = [];
let rows: Record<string, unknown[]> = {};
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const q: Record<string, unknown> = {};
      let key = '';
      for (const op of ['ilike', 'like']) {
        q[op] = (col: string, val: string) => { calls.push({ op, col, val }); key = `${col}:${op}:${val}`; return q; };
      }
      q.select = () => q;
      q.order = () => q;
      q.neq = () => q;
      q.limit = () => Promise.resolve({ data: rows[key] ?? [], error: null });
      return q;
    },
  },
}));

const { GET } = await import('./route');
const get = (qs: string) => GET(new NextRequest(`http://x/api/words?${qs}`)).then(r => r.json());

beforeEach(() => { calls.length = 0; rows = {}; });

describe('/api/words fuzzy', () => {
  it('does not query the fold key when fuzzy is off', async () => {
    await get('q=ਸਭੁ');
    expect(calls.some(c => c.col === 'search_fold')).toBe(false);
  });

  it('adds folded-spelling matches after exact ones when fuzzy is on', async () => {
    rows['gurmukhi:ilike:ਸਭੁ%'] = [{ id: 1, gurmukhi: 'ਸਭੁ', frequency: 9 }];
    rows['search_fold:like:ਸਭ%'] = [
      { id: 1, gurmukhi: 'ਸਭੁ', frequency: 9 },
      { id: 2, gurmukhi: 'ਸਭਿ', frequency: 5 },
    ];
    const { words } = await get('q=ਸਭੁ&fuzzy=1');
    expect(words).toEqual([
      { id: 1, gurmukhi: 'ਸਭੁ', frequency: 9 },
      { id: 2, gurmukhi: 'ਸਭਿ', frequency: 5, match: 'fold' },
    ]);
  });
});

describe('/api/words caching', () => {
  it('is cacheable at the CDN', async () => {
    const res = await GET(new NextRequest('http://x/api/words?q=ਸਭ'));
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });
});
