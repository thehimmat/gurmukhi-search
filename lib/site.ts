// The site's name (gurmukhi-kosh#133). Kept in step with gurmukhi-kosh's
// lib/site.ts, which titles the dictionary pages served under this domain.

export const SITE_NAME_PA = 'ਗੁਰਬਾਣੀ ਖੋਜ ਕੋਸ਼';
export const SITE_NAME_EN = 'Gurbani Search Dictionary';
export const SITE_TITLE = `${SITE_NAME_PA} — ${SITE_NAME_EN}`;

// Header nav, mirrored from gurmukhi-kosh's lib/site.ts (#127) so both zones
// of the domain show one menu.
export const NAV_LINKS = [
  { href: '/', label: 'Search' },
  { href: '/browse', label: 'Browse' },
  { href: '/ang/1', label: 'Read by ang' },
  { href: '/about', label: 'About' },
] as const;

/** Which nav link a path belongs under; word entries count as Search. */
export function activeNavHref(pathname: string): string | null {
  if (pathname === '/' || pathname.startsWith('/word/')) return '/';
  if (pathname.startsWith('/browse')) return '/browse';
  if (pathname.startsWith('/ang/')) return '/ang/1';
  if (pathname.startsWith('/about')) return '/about';
  return null;
}

/** The texts the dictionary indexes, as named in kosh's `sources` table. */
export const CORPORA = [
  'Sri Guru Granth Sahib Ji',
  'Bhai Gurdas Ji Vaaran',
  'Dasam Bani',
  'Sri Sarbloh Granth',
] as const;
