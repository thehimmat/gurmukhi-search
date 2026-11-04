import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('has no Search button — results populate as you type', () => {
    const html = renderToStaticMarkup(
      <SearchBar value="" onChange={() => {}} onSubmit={() => {}} mode="contains" layout="gurmukhi-qwerty" />,
    );
    expect(html).not.toMatch(/<button[^>]*>Search<\/button>/);
  });
});

describe('SearchBar clear button', () => {
  it('is a plain button, not a form submit', () => {
    const html = renderToStaticMarkup(
      <SearchBar value="ਸ" onChange={() => {}} onSubmit={() => {}} mode="contains" layout="gurmukhi-qwerty" />,
    );
    expect(html).toMatch(/<button type="button"[^>]*aria-label="Clear"/);
  });
});
