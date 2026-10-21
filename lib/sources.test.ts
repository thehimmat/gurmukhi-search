import { describe, it, expect } from 'vitest';
import { defaultSourceIds, isDefaultSources, sourceById, type SourceInfo } from './sources';
import { activeFilterCount } from './filters';
import { loadSources } from './sources-server';
import { fakeSupabase } from '../test/fake-supabase';

// kosh's sources table (migration 065): what each scripture is and whether it is searched by default.
const ROWS = [
  { id: 2, slug: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', rank: 30, page_unit: 'Vaar', searched_by_default: false },
  { id: 1, slug: 'sggs', name: 'Sri Guru Granth Sahib Ji', rank: 0, page_unit: 'Ang', searched_by_default: true },
  { id: 6, slug: 'nand-lal-ghazals', name: 'Bhai Nand Lal: Diwan-e-Goya (Ghazals)', rank: 40, page_unit: 'Ghazal', searched_by_default: false },
  { id: 3, slug: 'dasam', name: 'Dasam Bani', rank: 10, page_unit: 'Ang', searched_by_default: true },
];

const SOURCES: SourceInfo[] = [
  { id: 1, slug: 'sggs', name: 'Sri Guru Granth Sahib Ji', pageUnit: 'Ang', searchedByDefault: true },
  { id: 3, slug: 'dasam', name: 'Dasam Bani', pageUnit: 'Ang', searchedByDefault: true },
  { id: 2, slug: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', pageUnit: 'Vaar', searchedByDefault: false },
  { id: 6, slug: 'nand-lal-ghazals', name: 'Bhai Nand Lal: Diwan-e-Goya (Ghazals)', pageUnit: 'Ghazal', searchedByDefault: false },
];

describe('loadSources', () => {
  it('reads kosh sources in reading order', async () => {
    const db = fakeSupabase({ sources: ROWS }).client;
    expect(await loadSources(db as never)).toEqual(SOURCES);
  });

  it('throws rather than serve an empty list', async () => {
    await expect(loadSources(fakeSupabase({ sources: [] }).client as never)).rejects.toThrow(/no sources/);
  });
});

describe('default scriptures', () => {
  it('are the sources kosh marks searched_by_default', () => {
    expect(defaultSourceIds(SOURCES)).toEqual([1, 3]);
  });

  it('match in any order', () => {
    expect(isDefaultSources([3, 1], [1, 3])).toBe(true);
    expect(isDefaultSources([1], [1, 3])).toBe(false);
    expect(isDefaultSources(undefined, [1, 3])).toBe(false);
  });

  it('do not count as an active filter; any other choice does', () => {
    expect(activeFilterCount({ sources: [3, 1] }, [1, 3])).toBe(0);
    expect(activeFilterCount({ sources: [1] }, [1, 3])).toBe(1);
    expect(activeFilterCount({}, [1, 3])).toBe(1); // "all scriptures" is a change too
  });
});

describe('sourceById', () => {
  it('finds a line source, or nothing for an unknown id', () => {
    expect(sourceById(SOURCES, 6)?.pageUnit).toBe('Ghazal');
    expect(sourceById(SOURCES, 99)).toBeUndefined();
  });
});
