// Gurmukhi Unicode block: U+0A00–U+0A7F
// This file is the single source of truth for character taxonomy.
// Add new categories here; the pattern compiler picks them up automatically.

export const CONSONANTS = 'ਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵਸਹੜ';

// The three vowel-carrier letters (ੳ ਅ ੲ) plus their standalone vowel forms
export const VOWEL_CARRIERS = 'ੳਅੲਆਇਈਉਊਏਐਓਔੴ';

// Combining vowel signs (matras) — always attach to a preceding base char
export const VOWEL_DIACRITICS = 'ਾਿੀੁੂੇੈੋੌ';

// Nasal marks
export const NASAL_MARKS = 'ਂੰ'; // bindi (U+0A02), tippi (U+0A70)

// Other marks
export const VIRAMA = '੍';   // U+0A4D — sub-consonant joiner
export const ADDAK = 'ੱ';   // U+0A71 — gemination
export const VISARG = 'ਃ';  // U+0A03

// Characters that can be a "word base" (first codepoint of a word)
export const BASE_CHARS = CONSONANTS + VOWEL_CARRIERS;

// ─── Semi-wildcard categories ────────────────────────────────────────────────
// Add new entries here; keys become {categoryName} in pattern syntax.

export const CHAR_CATEGORIES: Record<string, string[]> = {
  // Phonological place of articulation
  velar:       ['ਕ', 'ਖ', 'ਗ', 'ਘ', 'ਙ'],
  palatal:     ['ਚ', 'ਛ', 'ਜ', 'ਝ', 'ਞ'],
  retroflex:   ['ਟ', 'ਠ', 'ਡ', 'ਢ', 'ਣ'],
  dental:      ['ਤ', 'ਥ', 'ਦ', 'ਧ', 'ਨ'],
  bilabial:    ['ਪ', 'ਫ', 'ਬ', 'ਭ', 'ਮ'],
  sibilant:    ['ਸ', 'ਹ'],

  // Phonological manner
  nasal:       ['ਨ', 'ਮ', 'ਙ', 'ਞ', 'ਣ'],
  aspirate:    ['ਖ', 'ਘ', 'ਛ', 'ਝ', 'ਠ', 'ਢ', 'ਥ', 'ਧ', 'ਫ', 'ਭ'],
  unaspirate:  ['ਕ', 'ਗ', 'ਚ', 'ਜ', 'ਟ', 'ਡ', 'ਤ', 'ਦ', 'ਪ', 'ਬ'],

  // Broad classes
  consonant:   [...CONSONANTS],
  vowelCarrier: [...VOWEL_CARRIERS],

  // Vowel diacritic groupings
  vowelDiacritic: [...VOWEL_DIACRITICS],
  ooraVowels:   ['ੁ', 'ੂ', 'ੋ', 'ੌ'],   // sounds belonging to the ੳ carrier
  eereeVowels:  ['ਿ', 'ੀ', 'ੇ', 'ੈ'],   // sounds belonging to the ੲ carrier
  aaVowels:     ['ਾ'],

  // Nasal marks
  nasalMark:    [...NASAL_MARKS],
};

// Returns true if the string is a single combining diacritic (matra / nasal mark)
export function isCombiningMark(ch: string): boolean {
  return (
    VOWEL_DIACRITICS.includes(ch) ||
    NASAL_MARKS.includes(ch) ||
    ch === ADDAK ||
    ch === VIRAMA
  );
}

// Returns true if the char is a Gurmukhi base character (consonant or vowel carrier)
export function isBaseChar(ch: string): boolean {
  return BASE_CHARS.includes(ch);
}
