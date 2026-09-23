// Number queries: recognising them, and the vocabulary for filtering them.
//
// Most numerals in Gurbani are structural tallies closing a verse (॥੧॥, and
// chains like ॥੪॥੪॥੧੬॥). A much smaller set identify the composition in a
// heading — the author (ਮਹਲਾ ੫, ਮਃ ੩, ਪਾਤਿਸਾਹੀ ੧੦) and the ghar (ਘਰੁ ੨).
// Searching a bare number is only useful if those can be told apart, so a
// digits-only query searches number_occurrences by role rather than running a
// substring match that would return every tally in the text.
//
// Roles are ASSIGNED in gurmukhi-kosh (lib/gurmukhi-numerals.ts, at ingest) and
// read back here through the list_number_roles RPC. This file deliberately does
// NOT carry a copy of the classifier — only the order the roles are offered in,
// their labels, and which are on by default. Adding a role means changing kosh;
// it shows up here as soon as the RPC returns it, needing only a label.

export const NUMBER_ROLES = ['author', 'ghar', 'heading_other', 'verse_marker'] as const;

export type NumberRole = (typeof NUMBER_ROLES)[number];

// Verse markers are left unchecked: they are ~90% of the numerals in the corpus
// and almost never what someone searching a number is looking for, so they stay
// opt-in rather than burying the heading hits.
export const DEFAULT_NUMBER_ROLES: NumberRole[] = ['author', 'ghar', 'heading_other'];

export const NUMBER_ROLE_LABELS: Record<NumberRole, string> = {
  author: 'ਮਹਲਾ / ਪਾਤਿਸਾਹੀ',
  ghar: 'ਘਰੁ',
  heading_other: 'Other heading',
  verse_marker: 'Verse marker',
};

export const NUMBER_ROLE_HELP: Record<NumberRole, string> = {
  author: "The Guru's number in a heading — ਮਹਲਾ ੫, ਮਃ ੩, ਪਾਤਿਸਾਹੀ ੧੦.",
  ghar: 'The ghar (musical house) number in a heading — ਘਰੁ ੨.',
  heading_other:
    'A heading number with no ਮਹਲਾ/ਘਰੁ keyword — ਪਉੜੀ ੧੯, ਛਕਾ ੧, or a counted form like ਦੁਤੁਕੇ ੯.',
  verse_marker:
    'The tally closing a verse or shabad — ॥੧॥, ॥੪॥੪॥੧੬॥. Most numerals in the text are these.',
};

// Gurmukhi digits are U+0A66–U+0A6F. ASCII is accepted because the default
// igurbani keyboard layout has no digit keys, so a typed "1" stays "1".
const GURMUKHI_ZERO = 0x0a66;
const ALL_DIGITS = /^[੦-੯0-9]+$/;

/** True when the whole query is digits — the condition that offers the filter. */
export function isNumericQuery(q: string): boolean {
  return ALL_DIGITS.test(q.trim());
}

/** The integer a numeric query means, or null when the query is not numeric. */
export function parseNumericQuery(q: string): number | null {
  const t = q.trim();
  if (!ALL_DIGITS.test(t)) return null;
  let n = 0;
  for (const ch of t) {
    const code = ch.codePointAt(0)!;
    n = n * 10 + (code >= GURMUKHI_ZERO && code <= GURMUKHI_ZERO + 9
      ? code - GURMUKHI_ZERO
      : code - 0x30);
  }
  return n;
}

/** Renders an integer in Gurmukhi digits, the script it is matched against. */
export function toGurmukhiDigits(n: number): string {
  return String(Math.trunc(Math.abs(n)))
    .split('')
    .map((d) => String.fromCodePoint(GURMUKHI_ZERO + Number(d)))
    .join('');
}
