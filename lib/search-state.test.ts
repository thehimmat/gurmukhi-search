import { describe, it, expect } from 'vitest';
import { searchFailed } from './search-state';

const base = { loading: true, loadingMore: true, error: null as string | null, loadMoreError: null as string | null, lines: [1, 2] };

describe('searchFailed', () => {
  it('shows a first-page failure as the search error, clearing the old results', () => {
    const s = searchFailed({ ...base, words: [3], total: 2 }, 0, 'boom');
    expect(s).toMatchObject({ error: 'boom', loadMoreError: null, loading: false, loadingMore: false, lines: [], words: [], total: 0 });
  });
  it('keeps a later-page failure apart, so the list stops asking for more', () => {
    const s = searchFailed(base, 2, 'boom');
    expect(s).toMatchObject({ error: null, loadMoreError: 'boom', loading: false, loadingMore: false, lines: [1, 2] });
  });
});
