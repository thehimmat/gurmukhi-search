// Fuzzy search levels. The matching itself happens in the database: kosh
// migration 047's fuzzy_fold() folds both the stored text and the query. This
// file mirrors those fold rules only to highlight a fuzzy match inside the
// original line — change both together (fuzzy.test.ts holds the same vectors
// the migration asserts).

export type FuzzyLevel = 0 | 1 | 2 | 3;

export const FUZZY_LEVELS: { level: FuzzyLevel; label: string; hint: string }[] = [
  { level: 0, label: 'Off', hint: 'Exact spelling' },
  { level: 1, label: 'Low', hint: 'ਕ/ਖ, ਗ/ਘ, ਤ/ਥ… and ਸ/ਸ਼ count as the same letter' },
  { level: 2, label: 'Medium', hint: 'Low, plus ਤ/ਟ, ਦ/ਡ, ਨ/ਣ/ਞ/ਙ and long/short vowels' },
  { level: 3, label: 'High', hint: 'Medium, plus any one letter may be wrong (3+ letters)' },
];

export function parseFuzzyLevel(v: string | null | undefined): FuzzyLevel {
  const n = Number(v);
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

const NUKTA = '਼';
const KANNA = 'ਾ';

const LOW: Record<string, string> = {
  'ਖ': 'ਕ', 'ਘ': 'ਗ', 'ਛ': 'ਚ', 'ਝ': 'ਜ', 'ਠ': 'ਟ', 'ਢ': 'ਡ',
  'ਥ': 'ਤ', 'ਧ': 'ਦ', 'ਫ': 'ਪ', 'ਭ': 'ਬ', 'ਣ': 'ਨ',
};

const MEDIUM: Record<string, string> = {
  ...LOW,
  'ਠ': 'ਤ', 'ਢ': 'ਦ', 'ਟ': 'ਤ', 'ਡ': 'ਦ', 'ਞ': 'ਨ', 'ਙ': 'ਨ',
  'ਆ': 'ਅ', 'ਈ': 'ਇ', 'ਊ': 'ਉ', 'ਐ': 'ਏ', 'ਔ': 'ਓ',
  'ੀ': 'ਿ', 'ੂ': 'ੁ', 'ੈ': 'ੇ', 'ੌ': 'ੋ',
};

// One already-decomposed character → its folded form ('' when dropped).
function foldChar(ch: string, level: FuzzyLevel): string {
  if (level === 0) return ch;
  if (ch === NUKTA) return '';
  if (level >= 2 && ch === KANNA) return '';
  return (level === 1 ? LOW : MEDIUM)[ch] ?? ch;
}

const foldLevel = (level: FuzzyLevel): FuzzyLevel => (level > 2 ? 2 : level);

export function fuzzyFold(s: string, level: FuzzyLevel): string {
  if (level === 0) return s;
  const l = foldLevel(level);
  return Array.from(s.normalize('NFD'), ch => foldChar(ch, l)).join('');
}

// Vowel signs and other marks that attach to the letter before them.
const COMBINING = /[ਁ-ਃ਼-ੑੰੱੵ]/;

// A base letter (consonant or independent vowel) after folding.
const LETTER_CLASS = '[\u0A05-\u0A39\u0A72\u0A73]';
const LETTER = new RegExp(`^${LETTER_CLASS}$`);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Where the query matches the line under this fuzzy level, as offsets into
// the original (unfolded) text, ready for splitBySpans.
export function fuzzyHighlightSpans(text: string, query: string, level: FuzzyLevel): { start: number; end: number }[] {
  const q = fuzzyFold(query.trim(), level);
  if (!q || level === 0) return [];

  // Fold the text one original code point at a time, remembering where each
  // folded character came from.
  let folded = '';
  const origin: number[] = [];
  let offset = 0;
  for (const cp of text) {
    for (const ch of cp.normalize('NFD')) {
      const f = foldChar(ch, foldLevel(level));
      for (const c of f) { folded += c; origin.push(offset); }
    }
    offset += cp.length;
  }

  // High: any one letter may be wrong. Only letter positions are wildcarded,
  // and only by a letter, so the wildcard never stands in for a space or a
  // vowel sign (kosh 048 builds the same alternation in SQL).
  const chars = Array.from(q);
  const letterAt = chars.flatMap((c, i) => (LETTER.test(c) ? [i] : []));
  const alternatives = level === 3 && letterAt.length >= 3
    ? letterAt.map(i => chars.map((c, j) => (i === j ? LETTER_CLASS : escapeRe(c))).join(''))
    : [escapeRe(q)];
  const re = new RegExp(alternatives.join('|'), 'g');

  const spans: { start: number; end: number }[] = [];
  for (const m of folded.matchAll(re)) {
    if (!m[0]) continue;
    const first = m.index!;
    const last = first + m[0].length - 1;
    const start = origin[first];
    let end = origin[last] + String.fromCodePoint(text.codePointAt(origin[last])!).length;
    // Take in the vowel signs the fold dropped from the end of the match.
    while (end < text.length && COMBINING.test(text[end])) end++;
    spans.push({ start, end });
  }
  return spans;
}
