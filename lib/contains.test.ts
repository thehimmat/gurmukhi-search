import { describe, it, expect } from 'vitest';
import { containsSpans } from './contains';

// Escapes, not literals: a tool that normalizes text would quietly turn the
// ready-made letters into the two-part ones and the tests would prove nothing.
const NUKTA = '਼';
const HALANT = '੍';
const SHA = 'ਸ਼'; // ਸ਼, one code point
const KHA_SPLIT = 'ਖ' + NUKTA; // ਖ਼ as ਖ + ਼

const marked = (text: string, needle: string) => containsSpans(text, needle).map(s => text.slice(s.start, s.end));

describe('containsSpans', () => {
  it('marks every plain occurrence', () => {
    expect(containsSpans('ਗੁਰ ਗੁਰੂ', 'ਗੁਰ')).toEqual([{ start: 0, end: 3 }, { start: 4, end: 7 }]);
  });

  it('marks ready-made and two-part nukta letters for a lone nukta', () => {
    expect(marked(`${SHA}ਬਦ ${KHA_SPLIT}ਾਲ`, NUKTA)).toEqual([SHA, KHA_SPLIT]);
  });

  it('marks a nukta letter whichever form the query uses', () => {
    expect(marked(`${SHA}ਬਦ`, 'ਸ' + NUKTA)).toEqual([SHA]);
    expect(marked(`${KHA_SPLIT}ਾਲ`, 'ਖ਼')).toEqual([KHA_SPLIT]);
  });

  it('does not mark a nukta letter for its plain letter', () => {
    expect(marked(`${SHA}ਬਦ ਸਬਦ`, 'ਸ')).toEqual(['ਸ']);
    expect(containsSpans(`${SHA}ਬਦ ਸਬਦ`, 'ਸ')).toEqual([{ start: 4, end: 5 }]);
  });

  it('marks a word-final halant stored after its nukta', () => {
    const text = `ਜਨਿੰਦ${HALANT}${NUKTA} ਦਿਸ`;
    expect(marked(text, `${HALANT} `)).toEqual([`${HALANT}${NUKTA} `]);
  });
});
