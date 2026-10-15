import { describe, it, expect, vi } from 'vitest';
import { fetchMeta } from './meta';

const ok = { raags: [{ name: 'Jap', lineCount: 1 }], writers: [{ name: 'Guru Nanak Dev Ji', lineCount: 1, sourceIds: [1] }], corpora: [{ id: 1, code: 'sggs', name: 'SGGS', lineCount: 1 }] };
const res = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('fetchMeta', () => {
  it('returns the facets on success without retrying', async () => {
    const f = vi.fn(() => res(200, ok));
    expect(await fetchMeta(f, { delayMs: 0 })).toEqual(ok);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('retries once after a 503 (cold start) and returns the second answer', async () => {
    const f = vi.fn().mockReturnValueOnce(res(503, { raags: [], writers: [], corpora: [] })).mockReturnValueOnce(res(200, ok));
    expect(await fetchMeta(f, { delayMs: 0 })).toEqual(ok);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('retries once after a network error', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockReturnValueOnce(res(200, ok));
    expect(await fetchMeta(f, { delayMs: 0 })).toEqual(ok);
  });

  it('gives up after the one retry', async () => {
    const f = vi.fn(() => res(503, {}));
    await expect(fetchMeta(f, { delayMs: 0 })).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  });
});
