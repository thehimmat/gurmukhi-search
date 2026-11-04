// What Enter does in the Dictionary box. The results on screen may still be for
// the previous query (the lookup is debounced), so opening results[0] could
// open the wrong word (#49). Only open it when the results answer what's typed;
// otherwise look the typed word up first.
type Hit = { gurmukhi: string };
export type SubmitTarget = { kind: 'open'; word: string } | { kind: 'lookup'; query: string } | { kind: 'none' };

export function submitTarget(query: string, settled: string, results: Hit[]): SubmitTarget {
  const q = query.trim();
  if (!q) return { kind: 'none' };
  if (settled !== q) return { kind: 'lookup', query: q };
  return results[0] ? { kind: 'open', word: results[0].gurmukhi } : { kind: 'none' };
}
