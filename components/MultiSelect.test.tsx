import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MultiSelect from './MultiSelect';

describe('MultiSelect', () => {
  it('names its button by the visible label', () => {
    const html = renderToStaticMarkup(
      <MultiSelect label="Writer" options={[]} selected={[]} onChange={() => {}} allLabel="All writers" />,
    );
    const id = html.match(/<span id="([^"]+)"[^>]*>Writer</)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(new RegExp(`<button[^>]*aria-labelledby="${id} [^"]+"`));
    const summaryId = html.match(new RegExp(`aria-labelledby="${id} ([^"]+)"`))?.[1];
    expect(html).toMatch(new RegExp(`<span id="${summaryId}"[^>]*>All writers<`));
  });
});
