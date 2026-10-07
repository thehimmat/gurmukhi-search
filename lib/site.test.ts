import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_NAME_EN, SITE_NAME_PA, SITE_TITLE } from './site';

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
