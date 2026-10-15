import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const calls: unknown[][] = [];
vi.mock('@/lib/search', async (orig) => ({
  ...(await orig<object>()),
  searchContains: (...a: unknown[]) => { calls.push(a); return Promise.resolve({ lines: [], total: 0, hasMore: false }); },
}));
const { GET } = await import('./route');
const get = (qs: string) => GET(new NextRequest(`http://x/api/search?${qs}`));

beforeEach(() => { calls.length = 0; });

describe('/api/search page param', () => {
  it.each(['abc', '-3', '', '1.5x'])('reads page=%s as a number, never null', async (page) => {
    const body = await (await get(`mode=contains&q=ਹਰਿ&page=${page}`)).json();
    expect(Number.isInteger(body.page)).toBe(true);
    expect(body.page).toBeGreaterThanOrEqual(0);
    expect(calls[0][2]).toBe(body.page);
  });

  it('keeps a valid page', async () => {
    const body = await (await get('mode=contains&q=ਹਰਿ&page=4')).json();
    expect(body.page).toBe(4);
  });
});
