import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ModeSelector from './ModeSelector';

describe('ModeSelector', () => {
  const html = renderToStaticMarkup(<ModeSelector value="contains" onChange={() => {}} />);

  it('offers Contains and First Letter', () => {
    expect(html).toContain('>Contains<');
    expect(html).toContain('>First Letter<');
  });

  it('hides Pattern and Letter Set from the main page', () => {
    expect(html).not.toContain('>Pattern<');
    expect(html).not.toContain('>Letter Set<');
  });
});

describe('ModeSelector semantics', () => {
  const html = renderToStaticMarkup(<ModeSelector value="first_letter" onChange={() => {}} />);

  it('is a named radio group, not a tablist without panels', () => {
    expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Search mode"/);
    expect(html).not.toContain('role="tab');
    expect(html).not.toContain('aria-selected');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>First Letter</);
    expect(html).toMatch(/aria-checked="false"[^>]*>Contains</);
    expect(html.match(/type="button"/g)).toHaveLength(2);
  });
});
