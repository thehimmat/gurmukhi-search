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

describe('/api/search errors', () => {
  it('answers 400, uncached, when the search fails', async () => {
    const search = await import('@/lib/search');
    const spy = vi.spyOn(search, 'searchFirstLetters').mockResolvedValue({ lines: [], total: 0, error: 'timeout' });
    const res = await get('mode=first_letter&q=ਹ');
    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('no-store');
    spy.mockRestore();
  });
});

describe('/api/search error shape (#48)', () => {
  it('answers a database timeout with 504 and friendly text', async () => {
    const search = await import('@/lib/search');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spy = vi.spyOn(search, 'searchContains').mockResolvedValue({
      lines: [], total: 0, dbError: { message: 'canceling statement due to statement timeout', code: '57014' },
    });
    const res = await get('mode=contains&q=ਸਤ&page=1');
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.code).toBe('timeout');
    expect(body.error).not.toMatch(/canceling statement/);
    spy.mockRestore(); log.mockRestore();
  });

  it('answers bad input with 400 and its own message', async () => {
    const search = await import('@/lib/search');
    const spy = vi.spyOn(search, 'searchPattern').mockResolvedValue({ lines: [], total: 0, error: 'Unclosed [' });
    const res = await get('mode=pattern&q=[');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Unclosed [', code: 'bad_input' });
    spy.mockRestore();
  });

  it('refuses a query over 200 characters without searching', async () => {
    const res = await get(`mode=contains&q=${encodeURIComponent('ਹ'.repeat(201))}`);
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it.each(['ang_min=abc', 'ang_max=1x', 'ang_min=2.5'])('refuses a non-numeric ang bound (%s)', async (qs) => {
    const res = await get(`mode=contains&q=ਹਰਿ&${qs}`);
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});
