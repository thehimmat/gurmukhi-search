import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeyboardLayoutOptions, KeyboardLayoutSwitch } from './KeyboardLayoutSwitch';

const render = (props: Partial<Parameters<typeof KeyboardLayoutSwitch>[0]> = {}) =>
  renderToStaticMarkup(
    <KeyboardLayoutSwitch layout="gurmukhi-qwerty" onChange={() => {}} {...props} />,
  );

describe('KeyboardLayoutSwitch', () => {
  it('starts collapsed: just a "Keyboard" toggle with a chevron', () => {
    const html = render();
    expect(html).toMatch(/aria-expanded="false"[^>]*>Keyboard.*›/);
    expect(html).not.toContain('Gurmukhi Keyboard');
    expect(html).not.toMatch(/igurbani/i);
  });

  it('shows the layout options when expanded', () => {
    const html = render({ defaultOpen: true });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('>Gurmukhi Keyboard<');
    expect(html).toContain('>iGurbani<');
  });

  it('drops the macOS QWERTY hint when expanded', () => {
    expect(render({ defaultOpen: true })).not.toContain('macOS Gurmukhi');
  });
});

describe('KeyboardLayoutOptions', () => {
  it('is a named radio group with the current layout checked', () => {
    const html = renderToStaticMarkup(<KeyboardLayoutOptions layout="igurbani" onChange={() => {}} />);
    expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Keyboard layout"/);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>iGurbani</);
    expect(html).toMatch(/aria-checked="false"[^>]*>Gurmukhi Keyboard</);
  });
});
