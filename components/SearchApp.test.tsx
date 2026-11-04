import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));
// Stand-ins that say whether the reading feeds mounted.
vi.mock('./Feeds', () => ({
  ShabadFeed: () => <div>shabad-feed</div>,
  WordFeed: () => <div>word-feed</div>,
}));

const { default: SearchApp } = await import('./SearchApp');

describe('SearchApp deep link', () => {
  beforeEach(() => { params = new URLSearchParams(); });

  it('shows the reading feed when there is no query', () => {
    expect(renderToStaticMarkup(<SearchApp />)).toContain('shabad-feed');
  });

  it('does not mount the feed for a ?q= link, and is already searching', () => {
    params = new URLSearchParams('q=ਸਤਿ');
    const html = renderToStaticMarkup(<SearchApp />);
    expect(html).not.toContain('shabad-feed');
    expect(html).toContain('Searching');
    expect(html).not.toContain('No results');
  });
});
