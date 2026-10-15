import { describe, it, expect } from 'vitest';
import { fuzzyFold, fuzzyHighlightSpans, parseFuzzyLevel, FUZZY_LEVELS, searchingLabel } from './fuzzy';

// The same vectors kosh migration 047 asserts for fuzzy_fold() in SQL, so the
// highlighter folds exactly as the search does.
describe('fuzzyFold (mirror of kosh fuzzy_fold)', () => {
  it('Low pairs aspirated/unaspirated consonants and drops nukta', () => {
    expect(fuzzyFold('ਖਾਲਸਾ', 1)).toBe('ਕਾਲਸਾ');
    expect(fuzzyFold('ਸ਼ਬਦ', 1)).toBe(fuzzyFold('ਸਬਦ', 1));
    expect(fuzzyFold('ਜ਼ਮੀਨ', 1)).toBe('ਜਮੀਨ');
    expect(fuzzyFold('ਠਾਕੁਰ', 1)).toBe('ਟਾਕੁਰ');
    expect(fuzzyFold('ਕਰਮ', 1)).not.toBe(fuzzyFold('ਧਰਮ', 1));
  });

  it('Medium adds dental/retroflex, nasals and vowel length', () => {
    expect(fuzzyFold('ਖਾਲਸਾ', 2)).toBe('ਕਲਸ');
    expect(fuzzyFold('ਠਾਕੁਰ', 2)).toBe('ਤਕੁਰ');
    expect(fuzzyFold('ਈਸਰੁ', 2)).toBe(fuzzyFold('ਇਸਰੂ', 2));
    expect(fuzzyFold('ਸਿਮਰੈ', 2)).toBe(fuzzyFold('ਸੀਮਰੇ', 2));
    expect(fuzzyFold('ਞ', 2)).toBe('ਨ');
  });

  it('Off leaves text alone', () => {
    expect(fuzzyFold('ਖ਼ਾਲਸਾ', 0)).toBe('ਖ਼ਾਲਸਾ');
  });
});

describe('fuzzyHighlightSpans', () => {
  const marked = (text: string, q: string, lvl: 0 | 1 | 2 | 3) =>
    fuzzyHighlightSpans(text, q, lvl).map(s => text.slice(s.start, s.end));

  it('finds a spelling variant of the query in the original text', () => {
    expect(marked('ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ', 'ਸਤੀਗੁਰ', 2)).toEqual(['ਸਤਿਗੁਰ']);
    expect(marked('ਵਾਹਿਗੁਰੂ ਜੀ', 'ਵਹਿਗੁਰੁ', 2)).toEqual(['ਵਾਹਿਗੁਰੂ']);
  });

  it('includes trailing vowel signs the fold dropped', () => {
    expect(marked('ਨਾਨਕ ਨਾਮੁ', 'ਨਨਕ', 2)).toEqual(['ਨਾਨਕ']);
  });

  it('High allows one wrong letter', () => {
    expect(marked('ਧਰਮ ਕਰਮ', 'ਕਰਮ', 3)).toEqual(['ਧਰਮ', 'ਕਰਮ']);
    expect(marked('ਧਰਮ ਕਰਮ', 'ਕਰਮ', 2)).toEqual(['ਕਰਮ']);
  });

  it('High swaps a letter for a letter, never for a space or vowel sign', () => {
    // Live preview bug: the wildcard matched the space in "ਪਾਵ ਗੁਰੂ".
    expect(marked('ਹਮ ਮਲਿ ਧੋਵਹ ਪਾਵ ਗੁਰੂ ਕੇ', 'ਵਾਹਗੁਰੂ', 3)).toEqual([]);
    expect(marked('ਸੇਵਕ ਵਾਹਗੁਰੂ ਤੇਰਾ', 'ਵਾਹਗੁਰੂ', 3)).toEqual(['ਵਾਹਗੁਰੂ']);
    expect(marked('ਕਰਿ ਕਰਮ', 'ਕਰਮ', 3)).toEqual(['ਕਰਮ']);
  });
});

describe('fuzzy levels', () => {
  it('offers Off first, then Low, Medium, High', () => {
    expect(FUZZY_LEVELS.map(l => l.label)).toEqual(['Off', 'Low', 'Medium', 'High']);
  });
  it('parses the URL/storage value, defaulting to Off', () => {
    expect(parseFuzzyLevel('2')).toBe(2);
    expect(parseFuzzyLevel(null)).toBe(0);
    expect(parseFuzzyLevel('9')).toBe(0);
  });
});

describe('searchingLabel', () => {
  it('adds a short slow note only at High', () => {
    expect(searchingLabel(0)).toBe('Searching…');
    expect(searchingLabel(2)).toBe('Searching…');
    expect(searchingLabel(3)).toBe('Searching… may be slow');
  });
});
