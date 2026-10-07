import { describe, it, expect } from 'vitest';
import { CONCEPTS, MOOL_MANTAR, LANDING_WORDS, withCounts } from './landing';

describe('landing word lists', () => {
  it('spells the Mool Mantar word by word, in order', () => {
    expect(MOOL_MANTAR.join(' ')).toBe(
      'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ'
    );
  });

  it('asks the DB once for every word either list shows, without duplicates', () => {
    expect(new Set(LANDING_WORDS).size).toBe(LANDING_WORDS.length);
    for (const w of [...MOOL_MANTAR, ...CONCEPTS]) expect(LANDING_WORDS).toContain(w);
  });
});

describe('withCounts', () => {
  it('keeps list order and attaches each word\'s count', () => {
    const rows = [
      { gurmukhi: 'ਨਾਮੁ', frequency: 3514 },
      { gurmukhi: 'ਸਤਿ', frequency: 408 },
    ];
    expect(withCounts(['ਸਤਿ', 'ਨਾਮੁ'], rows)).toEqual([
      { gurmukhi: 'ਸਤਿ', frequency: 408 },
      { gurmukhi: 'ਨਾਮੁ', frequency: 3514 },
    ]);
  });

  it('leaves the count null for a word the DB did not return', () => {
    expect(withCounts(['ਸਤਿ'], [])).toEqual([{ gurmukhi: 'ਸਤਿ', frequency: null }]);
  });

  it('matches across Unicode normalization forms', () => {
    const nfd = 'ਪ੍ਰਸਾਦਿ'.normalize('NFD');
    expect(withCounts(['ਪ੍ਰਸਾਦਿ'], [{ gurmukhi: nfd, frequency: 827 }])[0].frequency).toBe(827);
  });
});
