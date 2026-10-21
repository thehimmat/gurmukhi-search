// The scriptures search covers, as kosh's `sources` table describes them (kosh migration 065):
// reading order, page unit and which are searched by default. Loaded on the server
// (lib/sources-server.ts) and handed to the page, so no source id or name lives in code.
// Client-safe: no Supabase import (#38).

export type SourceInfo = { id: number; slug: string; name: string; pageUnit: string; searchedByDefault: boolean };

/** The scriptures searched unless the reader changes the Scripture filter. */
export function defaultSourceIds(sources: SourceInfo[]): number[] {
  return sources.filter((s) => s.searchedByDefault).map((s) => s.id);
}

export function isDefaultSources(selected: number[] | undefined, defaults: number[]): boolean {
  if (!selected) return false;
  return selected.length === defaults.length && defaults.every((id) => selected.includes(id));
}

export function sourceById(sources: SourceInfo[], id: number): SourceInfo | undefined {
  return sources.find((s) => s.id === id);
}
