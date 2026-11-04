import { describe, it, expect } from 'vitest';
import { snapToClusters } from './gurmukhi-clusters';

const marked = (text: string, spans: { start: number; end: number }[]) =>
  snapToClusters(text, spans).map(s => text.slice(s.start, s.end));

// gurmukhi-kosh#347: a highlight that ends after ਮ leaves the vowel sign or
// pairin in its own text run, and the browser draws it on a dotted circle.
describe('snapToClusters', () => {
  it('takes the vowel sign with the consonant it follows', () => {
    expect(marked('ਮੋਹਿ', [{ start: 0, end: 1 }])).toEqual(['ਮੋ']);
    expect(marked('ਮਾਰੋ', [{ start: 0, end: 1 }])).toEqual(['ਮਾ']);
  });

  it('takes a pairin (halant + consonant) and its vowel sign', () => {
    expect(marked('ਮ੍ਰਿਗ', [{ start: 0, end: 1 }])).toEqual(['ਮ੍ਰਿ']);
  });

  it('takes nasal marks, addak and nukta', () => {
    expect(marked('ਮੰਗ', [{ start: 0, end: 1 }])).toEqual(['ਮੰ']);
    expect(marked('ਮੱਤ', [{ start: 0, end: 1 }])).toEqual(['ਮੱ']);
    expect(marked('ਸ਼ਬਦ', [{ start: 0, end: 1 }])).toEqual(['ਸ਼']);
  });

  it('moves a start that falls on a mark back to its consonant', () => {
    expect(marked('ਮੋਹਿ', [{ start: 1, end: 2 }])).toEqual(['ਮੋ']);
    expect(marked('ਮ੍ਰਿਗ', [{ start: 2, end: 4 }])).toEqual(['ਮ੍ਰਿ']);
  });

  it('leaves spans that already end on a letter boundary alone', () => {
    expect(snapToClusters('ਆਜ ਮੋਹਿ', [{ start: 0, end: 2 }])).toEqual([{ start: 0, end: 2 }]);
    expect(snapToClusters('abc', [{ start: 1, end: 2 }])).toEqual([{ start: 1, end: 2 }]);
  });

  it('merges spans that meet once snapped', () => {
    expect(snapToClusters('ਮੋਹਿ', [{ start: 0, end: 1 }, { start: 1, end: 2 }])).toEqual([{ start: 0, end: 2 }]);
  });
});
