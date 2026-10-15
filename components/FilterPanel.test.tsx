import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FilterPanel from './FilterPanel';

const props = {
  filters: { sources: [1, 3] },
  onChange: () => {},
  raags: [{ name: 'Asa', lineCount: 10 }],
  writers: [{ name: 'Guru Nanak Dev Ji', lineCount: 10, sourceIds: [1] }],
  corpora: [{ id: 1, code: 'sggs', name: 'Sri Guru Granth Sahib Ji', lineCount: 10 }],
};

describe('FilterPanel', () => {
  it('offers every facet for line search', () => {
    const html = renderToStaticMarkup(<FilterPanel {...props} />);
    for (const label of ['Scripture', 'Writer', 'Raag', 'Ang from', 'Ang to']) expect(html).toContain(label);
  });

  it('offers only Scripture and Writer for word search', () => {
    const html = renderToStaticMarkup(<FilterPanel {...props} facets="words" />);
    expect(html).toContain('Scripture');
    expect(html).toContain('Writer');
    for (const label of ['Raag', 'Ang from', 'Ang to']) expect(html).not.toContain(label);
  });
});
