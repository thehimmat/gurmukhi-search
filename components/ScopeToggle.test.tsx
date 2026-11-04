import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ScopeToggle from './ScopeToggle';

describe('ScopeToggle', () => {
  const html = renderToStaticMarkup(<ScopeToggle value="line" onChange={() => {}} />);

  it('is a radio group named by its "Show" label', () => {
    const id = html.match(/<span id="([^"]+)"[^>]*>Show</)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`role="radiogroup" aria-labelledby="${id}"`);
    expect(html).not.toContain('role="tab');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>Lines</);
    expect(html).toMatch(/aria-checked="false"[^>]*>Words</);
  });
});
