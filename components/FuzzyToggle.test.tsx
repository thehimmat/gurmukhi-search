import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FuzzyToggle } from './FuzzyToggle';

describe('FuzzyToggle', () => {
  it('is an on/off switch', () => {
    expect(renderToStaticMarkup(<FuzzyToggle on={false} onChange={() => {}} />))
      .toContain('role="switch" aria-checked="false"');
    expect(renderToStaticMarkup(<FuzzyToggle on onChange={() => {}} />))
      .toContain('role="switch" aria-checked="true"');
  });
});
