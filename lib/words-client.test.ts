import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWords } from './words-client';

afterEach(() => { vi.unstubAllGlobals(); });

describe('fetchWords', () => {
  it('asks /api/words for the query and fuzzy level', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ words: [{ id: 1, gurmukhi: 'ਨਾਮੁ', frequency: 3 }] })));
    vi.stubGlobal('fetch', fetch);
    const words = await fetchWords('ਨਾਮ', 2);
    expect(fetch.mock.calls[0][0]).toBe(`/api/words?q=${encodeURIComponent('ਨਾਮ')}&fuzzy=2`);
    expect(words).toEqual([{ id: 1, gurmukhi: 'ਨਾਮੁ', frequency: 3 }]);
  });

  it('leaves the fuzzy param off when fuzzy is off', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"words":[]}'));
    vi.stubGlobal('fetch', fetch);
    await fetchWords('ਨਾਮ', 0);
    expect(fetch.mock.calls[0][0]).toBe(`/api/words?q=${encodeURIComponent('ਨਾਮ')}`);
  });

  it('throws on an error response instead of reading it as no words', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"timeout"}', { status: 500 })));
    await expect(fetchWords('ਨਾਮ', 0)).rejects.toThrow('timeout');
  });

  it('passes the abort signal through', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"words":[]}'));
    vi.stubGlobal('fetch', fetch);
    const ctrl = new AbortController();
    await fetchWords('ਨਾਮ', 0, ctrl.signal);
    expect(fetch.mock.calls[0][1]).toMatchObject({ signal: ctrl.signal });
  });
});
