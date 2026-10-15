import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultCard from './ResultCard';

const line = {
  id: 1, verse_id: 1, shabad_id: 1, ang: 8, line_no: 14, gurmukhi: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
  translation_en: null, transliteration_en: null, shabads: null,
};

describe('ResultCard highlighting', () => {
  it('marks the fuzzy match, not just exact text', () => {
    const html = renderToStaticMarkup(<ResultCard line={line} query="ਸਤੀਗੁਰ" mode="contains" fuzzyLevel={2} />);
    expect(html).toMatch(/<mark[^>]*>ਸਤਿਗੁਰ<\/mark>/);
  });

  it('marks nothing for a non-matching exact query', () => {
    const html = renderToStaticMarkup(<ResultCard line={line} query="ਸਤੀਗੁਰ" mode="contains" />);
    expect(html).not.toContain('<mark');
  });
});
