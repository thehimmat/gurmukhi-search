import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SegmentedControl } from './SearchApp';

describe('SegmentedControl', () => {
  it('is a named radio group of Gurbani / Dictionary', () => {
    const html = renderToStaticMarkup(<SegmentedControl value="kosh" onChange={() => {}} />);
    expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Search zone"/);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html.match(/type="button"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<button).)*Dictionary/);
    expect(html).toMatch(/aria-checked="false"[^>]*>(?:(?!<button).)*Gurbani/);
  });
});
