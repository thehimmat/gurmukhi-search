// sources.id for each scripture in the kosh DB. Ids are stable across
// re-ingests (sources rows are never recreated), so the defaults can be set
// before /api/meta has loaded the corpus list.
export const SOURCE_IDS = {
  sggs: 1,
  bhaiGurdas: 2,
  dasam: 3,
  sarbloh: 4,
} as const;

// Searched unless the user changes the Scripture filter.
export const DEFAULT_SOURCES: number[] = [SOURCE_IDS.sggs, SOURCE_IDS.dasam];

export function isDefaultSources(sources: number[] | undefined): boolean {
  if (!sources) return false;
  return sources.length === DEFAULT_SOURCES.length && DEFAULT_SOURCES.every(id => sources.includes(id));
}
