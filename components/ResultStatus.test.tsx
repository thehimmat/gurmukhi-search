import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoResults, ResultCount } from './ResultStatus';

const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, '');

describe('ResultCount', () => {
  it('gives the exact total when it is known', () => {
    expect(text(<ResultCount showed={20} total={8824} hasMore />)).toBe('Showing 20 of 8,824 results');
    expect(text(<ResultCount showed={1} total={1} hasMore={false} />)).toBe('Showing 1 of 1 result');
  });

  it('says "20+" while more are known to exist but not how many', () => {
    expect(text(<ResultCount showed={20} total={null} hasMore />)).toBe('Showing 20+ results');
  });

  it('is plain when an unknown total has no more pages', () => {
    expect(text(<ResultCount showed={12} total={null} hasMore={false} />)).toBe('Showing 12 results');
    expect(text(<ResultCount showed={1} total={null} hasMore={false} />)).toBe('Showing 1 result');
  });
});

describe('NoResults', () => {
  it('says only that nothing matched the query', () => {
    expect(text(<NoResults query="ਨਹxyz" />)).toBe('No results for “ਨਹxyz”');
    expect(renderToStaticMarkup(<NoResults query="x" />)).not.toContain('ਕੁਝ ਨਹੀਂ ਮਿਲਿਆ');
  });

  it('can carry its own message', () => {
    expect(text(<NoResults message="No words match this letter set" />)).toBe('No words match this letter set');
  });
});
