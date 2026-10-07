import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORPORA, NAV_LINKS, SITE_NAME_EN, SITE_NAME_PA, SITE_TITLE, activeNavHref } from './site';

// #133 (gurmukhi-kosh): the site is ਗੁਰਬਾਣੀ ਖੋਜ ਕੋਸ਼ / Gurbani Search Dictionary.
describe('site name', () => {
  it('drops the separator dot and pairs the Gurmukhi with English', () => {
    expect(SITE_NAME_PA).toBe('ਗੁਰਬਾਣੀ ਖੋਜ ਕੋਸ਼');
    expect(SITE_NAME_EN).toBe('Gurbani Search Dictionary');
    expect(SITE_TITLE).toBe('ਗੁਰਬਾਣੀ ਖੋਜ ਕੋਸ਼ — Gurbani Search Dictionary');
  });

  it('leaves the old dotted name nowhere in the layout', () => {
    const layout = readFileSync(join(__dirname, '..', 'app', 'layout.tsx'), 'utf8');
    expect(layout).not.toMatch(/ਖੋਜ · ਕੋਸ਼|Search & Dictionary/);
  });
});

describe('site nav (gurmukhi-kosh#127)', () => {
  it('matches the dictionary zone: Search, Browse, Read by ang, About', () => {
    expect(NAV_LINKS.map(l => [l.label, l.href])).toEqual([
      ['Search', '/'],
      ['Browse', '/browse'],
      ['Read by ang', '/ang/1'],
      ['About', '/about'],
    ]);
  });

  it('marks the search page as Search', () => {
    expect(activeNavHref('/')).toBe('/');
    expect(activeNavHref('/something-else')).toBeNull();
  });

  it('lists every indexed text for the footer', () => {
    expect(CORPORA).toEqual(['Sri Guru Granth Sahib Ji', 'Bhai Gurdas Ji Vaaran', 'Dasam Bani', 'Sri Sarbloh Granth']);
  });
});
