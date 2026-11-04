import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LetterSetBuilder from './LetterSetBuilder';
import WordResultControls from './WordResultControls';
import { DEFAULT_LETTER_SET_QUERY } from '@/lib/letterset';

// The page's settings row already has the Keyboard toggle; these take its layout.
describe('hidden-mode controls', () => {
  it('LetterSetBuilder has no Keyboard toggle of its own', () => {
    const html = renderToStaticMarkup(
      <LetterSetBuilder query={DEFAULT_LETTER_SET_QUERY} onChange={() => {}} onSubmit={() => {}} layout="igurbani" />,
    );
    expect(html).not.toMatch(/>Keyboard</);
  });

  it('WordResultControls has no Keyboard toggle of its own', () => {
    const html = renderToStaticMarkup(
      <WordResultControls
        sort="freq_desc" onSortChange={() => {}}
        filter="" onFilterChange={() => {}}
        filterMode="prefix" onFilterModeChange={() => {}}
        layout="igurbani"
      />,
    );
    expect(html).not.toMatch(/>Keyboard</);
  });
});
