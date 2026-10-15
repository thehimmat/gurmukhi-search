import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeyboardLayoutSwitch } from './KeyboardLayoutSwitch';

const render = (props: Partial<Parameters<typeof KeyboardLayoutSwitch>[0]> = {}) =>
  renderToStaticMarkup(
    <KeyboardLayoutSwitch layout="gurmukhi-qwerty" onChange={() => {}} {...props} />,
  );

describe('KeyboardLayoutSwitch', () => {
  it('starts collapsed: just a "Keyboard" toggle with a chevron', () => {
    const html = render();
    expect(html).toMatch(/aria-expanded="false"[^>]*>Keyboard.*›/);
    expect(html).not.toContain('Gurmukhi Keyboard');
    expect(html).not.toContain('igurbani');
  });

  it('shows the layout options when expanded', () => {
    const html = render({ defaultOpen: true });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('>Gurmukhi Keyboard<');
    expect(html).toContain('>igurbani<');
  });

  it('drops the macOS QWERTY hint when expanded', () => {
    expect(render({ defaultOpen: true })).not.toContain('macOS Gurmukhi');
  });
});
