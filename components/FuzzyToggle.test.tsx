import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FuzzyLevelPicker } from './FuzzyToggle';

describe('FuzzyLevelPicker', () => {
  it('is a radio group of Off / Low / Medium / High with Off selected by default', () => {
    const html = renderToStaticMarkup(<FuzzyLevelPicker level={0} onChange={() => {}} />);
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(4);
    expect(html).toMatch(/aria-checked="true"[^>]*>Off</);
    expect(html.indexOf('>Off<')).toBeLessThan(html.indexOf('>High<'));
  });
});
