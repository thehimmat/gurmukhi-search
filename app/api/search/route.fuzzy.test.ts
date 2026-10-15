import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const calls: unknown[][] = [];
vi.mock('@/lib/search', async (orig) => ({
  ...(await orig<object>()),
  searchContains: (...a: unknown[]) => { calls.push(['contains', ...a]); return Promise.resolve({ lines: [], total: null, hasMore: false }); },
  searchFirstLetters: (...a: unknown[]) => { calls.push(['first_letter', ...a]); return Promise.resolve({ lines: [], total: 0 }); },
}));
const { GET } = await import('./route');
const get = (qs: string) => GET(new NextRequest(`http://x/api/search?${qs}`));

beforeEach(() => { calls.length = 0; });

describe('/api/search fuzzy level', () => {
  it('passes fz through to Contains and First Letter', async () => {
    await get('mode=contains&q=ਕਰਮ&fz=3');
    await get('mode=first_letter&q=ਸਨਕ&fz=1');
    expect(calls[0][0]).toBe('contains');
    expect(calls[0].at(-1)).toBe(3);
    expect(calls[1][0]).toBe('first_letter');
    expect(calls[1].at(-1)).toBe(1);
  });

  it('treats a missing or bad fz as Off', async () => {
    await get('mode=contains&q=ਕਰਮ&fz=nope');
    expect(calls[0].at(-1)).toBe(0);
  });
});
