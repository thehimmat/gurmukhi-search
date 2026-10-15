import { describe, it, expect, vi } from 'vitest';

const facets = { raags: [{ name: 'Asa', lineCount: 1 }], writers: [{ name: 'W', lineCount: 1, sourceIds: [1] }], corpora: [{ id: 1, code: 's', name: 'S', lineCount: 1 }] };
let raags = facets.raags;
vi.mock('@/lib/search', () => ({
  listRaags: () => Promise.resolve(raags),
  listWriters: () => Promise.resolve(facets.writers),
  listCorpora: () => Promise.resolve(facets.corpora),
}));
const { GET } = await import('./route');

describe('/api/meta', () => {
  it('is cached at the CDN when every list is present', async () => {
    raags = facets.raags;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
  });

  it('is never cached when a list comes back empty', async () => {
    raags = [];
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
