import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PatternHelp from './PatternHelp';

describe('PatternHelp', () => {
  it('turns its ▶ marker when the reference is open', () => {
    const html = renderToStaticMarkup(<PatternHelp />);
    expect(html).toMatch(/<details class="group[ "]/);
    expect(html).toMatch(/<span[^>]*class="[^"]*group-open:rotate-90[^"]*"[^>]*>▶</);
  });
});
