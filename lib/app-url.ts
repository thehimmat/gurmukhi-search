// The search page's URL: which zone (Gurbani or Dictionary) and what's typed,
// so refresh, Back and a shared link reproduce the search (#49).
export type AppMode = 'gurbani' | 'kosh';

// Anything else (?mode=foo) used to match neither branch and render a blank page.
export function parseAppMode(v: string | null): AppMode {
  return v === 'kosh' ? 'kosh' : 'gurbani';
}

export function searchHref(mode: AppMode, query: string): string {
  const params = new URLSearchParams();
  if (mode !== 'gurbani') params.set('mode', mode);
  const q = query.trim();
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}
