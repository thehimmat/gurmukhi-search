import { describe, it, expect } from 'vitest';
import { parseAppMode, searchHref } from './app-url';

describe('parseAppMode', () => {
  it('accepts gurbani and kosh', () => {
    expect(parseAppMode('gurbani')).toBe('gurbani');
    expect(parseAppMode('kosh')).toBe('kosh');
  });
  it.each([null, '', 'foo', 'KOSH', 'contains'])('falls back to gurbani for %s', (v) => {
    expect(parseAppMode(v)).toBe('gurbani');
  });
});

describe('searchHref', () => {
  it('keeps the default mode out of the URL', () => {
    expect(searchHref('gurbani', 'ਹਰਿ')).toBe(`/?q=${encodeURIComponent('ਹਰਿ')}`);
  });
  it('names the Dictionary mode', () => {
    expect(searchHref('kosh', 'ਨਾਮੁ')).toBe(`/?mode=kosh&q=${encodeURIComponent('ਨਾਮੁ')}`);
  });
  it('drops an empty or whitespace query', () => {
    expect(searchHref('gurbani', '  ')).toBe('/');
    expect(searchHref('kosh', '')).toBe('/?mode=kosh');
  });
  it('trims the query', () => {
    expect(searchHref('gurbani', ' ਹਰਿ ')).toBe(`/?q=${encodeURIComponent('ਹਰਿ')}`);
  });
});
