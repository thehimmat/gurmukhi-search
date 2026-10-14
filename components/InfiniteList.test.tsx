import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfiniteList, shouldLoadMore } from './InfiniteList';

describe('shouldLoadMore', () => {
  const ok = { hasMore: true, loading: false, error: null };
  it('loads once the last rendered row is near the end', () => {
    expect(shouldLoadMore(17, 20, ok)).toBe(true);
    expect(shouldLoadMore(10, 20, ok)).toBe(false);
  });
  it('loads straight away when the list is empty', () => {
    expect(shouldLoadMore(-1, 0, ok)).toBe(true);
  });
  it('waits while loading, after an error, or at the end', () => {
    expect(shouldLoadMore(19, 20, { ...ok, loading: true })).toBe(false);
    expect(shouldLoadMore(19, 20, { ...ok, error: 'x' })).toBe(false);
    expect(shouldLoadMore(19, 20, { ...ok, hasMore: false })).toBe(false);
  });
});

describe('InfiniteList', () => {
  const base = { items: [], getKey: (i: number) => i, renderItem: (i: number) => <p>{i}</p>, onLoadMore: () => {} };

  it('has no "show more" button', () => {
    const html = renderToStaticMarkup(<InfiniteList {...base} hasMore loading={false} error={null} />);
    expect(html).not.toMatch(/<button/);
  });
  it('shows a loader while a page is on its way', () => {
    expect(renderToStaticMarkup(<InfiniteList {...base} hasMore loading error={null} />)).toContain('aria-busy="true"');
  });
  it('offers a retry when a page fails', () => {
    expect(renderToStaticMarkup(<InfiniteList {...base} hasMore loading={false} error="boom" />)).toMatch(/<button[^>]*>Try again</);
  });
});
