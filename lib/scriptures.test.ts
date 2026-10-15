import { describe, it, expect } from 'vitest';
import { DEFAULT_SOURCES, SOURCE_IDS } from './scriptures';
import { activeFilterCount } from './supabase';

describe('default scriptures', () => {
  it('are SGGS and Dasam Bani', () => {
    expect(DEFAULT_SOURCES).toEqual([SOURCE_IDS.sggs, SOURCE_IDS.dasam]);
  });

  it('do not count as an active filter', () => {
    expect(activeFilterCount({ sources: [...DEFAULT_SOURCES] })).toBe(0);
    expect(activeFilterCount({ sources: [SOURCE_IDS.dasam, SOURCE_IDS.sggs] })).toBe(0);
  });

  it('count once the selection differs from the default', () => {
    expect(activeFilterCount({ sources: [SOURCE_IDS.sggs] })).toBe(1);
    expect(activeFilterCount({})).toBe(1); // "all scriptures" is a change too
  });
});
