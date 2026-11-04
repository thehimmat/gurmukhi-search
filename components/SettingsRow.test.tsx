import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsRow } from './SettingsRow';

const items = [
  { id: 'filters', label: 'Filters', badge: 2, content: <p>filters-body</p> },
  { id: 'fuzzy', label: 'Fuzzy', content: <p>fuzzy-body</p> },
  { id: 'keyboard', label: 'Keyboard', content: <p>keyboard-body</p> },
];

describe('SettingsRow', () => {
  it('lays the toggles out in order, all collapsed', () => {
    const html = renderToStaticMarkup(<SettingsRow items={items} />);
    const order = ['Filters', 'Fuzzy', 'Keyboard'].map(l => html.indexOf(`>${l}`));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    expect(html).not.toMatch(/-body/);
  });

  it('shows a count badge when one is given', () => {
    expect(renderToStaticMarkup(<SettingsRow items={items} />)).toMatch(/Filters.*>2</);
  });

  it('opens only the requested panel', () => {
    const html = renderToStaticMarkup(<SettingsRow items={items} defaultOpen="fuzzy" />);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html).toContain('fuzzy-body');
    expect(html).not.toContain('filters-body');
    expect(html).not.toContain('keyboard-body');
  });
});

describe('SettingsRow accessibility', () => {
  it('ties the open toggle to its panel', () => {
    const html = renderToStaticMarkup(<SettingsRow items={items} defaultOpen="fuzzy" />);
    const controls = html.match(/aria-expanded="true"[^>]*aria-controls="([^"]+)"|aria-controls="([^"]+)"[^>]*aria-expanded="true"/);
    const id = controls?.[1] ?? controls?.[2];
    expect(id).toBeTruthy();
    expect(html).toMatch(new RegExp(`<div id="${id}"[^>]*><p>fuzzy-body`));
  });

  it('reads the badge as a count of active filters', () => {
    const html = renderToStaticMarkup(<SettingsRow items={items} />);
    expect(html).toMatch(/>2<span class="sr-only"> active<\/span>/);
  });
});
