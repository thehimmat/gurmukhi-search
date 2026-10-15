import { describe, it, expect } from 'vitest';
import { cachedFirstPage, firstPageKey } from './first-page-cache';

describe('firstPageKey', () => {
  it('is the same for the same search however the URL was built', () => {
    const a = firstPageKey(new URLSearchParams('q=ਹ&mode=first_letter&source=3&source=1&page=0'));
    const b = firstPageKey(new URLSearchParams('source=1&mode=first_letter&source=3&q=ਹ'));
    expect(a).toBe(b);
  });

  it('tells different searches apart', () => {
    expect(firstPageKey(new URLSearchParams('q=ਹ&fz=1'))).not.toBe(firstPageKey(new URLSearchParams('q=ਹ&fz=2')));
  });
});

describe('cachedFirstPage', () => {
  it('still answers outside a Next server, where there is no data cache', async () => {
    expect(await cachedFirstPage('k', async () => 42)).toBe(42);
  });

  it('passes errors through', async () => {
    await expect(cachedFirstPage('k', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
});
