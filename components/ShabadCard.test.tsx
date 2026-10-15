import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShabadCard } from './ShabadCard';
import type { ShabadGroup } from '@/lib/feed';

const line = (id: number, extra = {}) => ({
  id, verse_id: id, shabad_id: 1, ang: 2, line_no: id, corpus_rank: 0, source_fk: 1,
  gurmukhi: `ਪੰਗਤੀ ${id}`, translation_en: `Line ${id}`, transliteration_en: null,
  shabads: { id: 1, raag_english: 'Jap', raag_gurmukhi: 'ਜਪੁ', writer_english: 'Guru Nanak Dev Ji', writer_id: 1, ang_start: 1 },
  ...extra,
});

describe('ShabadCard', () => {
  it('shows the shabad header once and every line in order', () => {
    const g: ShabadGroup = { key: 's1', lines: [line(1), line(2)] };
    const html = renderToStaticMarkup(<ShabadCard group={g} />);
    expect(html.match(/Guru Nanak Dev Ji/g)).toHaveLength(1);
    expect(html.indexOf('ਪੰਗਤੀ 1')).toBeLessThan(html.indexOf('ਪੰਗਤੀ 2'));
    expect(html).toMatch(/Ang<\/span> 2/);
    expect(html).toContain('Line 1');
  });

  it('names the scripture outside SGGS', () => {
    const g: ShabadGroup = { key: 's9', lines: [line(1, { source_fk: 3, shabads: null })] };
    expect(renderToStaticMarkup(<ShabadCard group={g} />)).toContain('Dasam Bani');
  });
});
