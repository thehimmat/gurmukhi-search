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
