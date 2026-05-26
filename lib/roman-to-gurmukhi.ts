// Roman → Gurmukhi phonetic keyboard mapping, based on the igurbani.com layout.
// This is the "first-letter" mapping used for anagram-style search.
// Each key is what the user types; the value is the Gurmukhi character it produces.
//
// For vowel diacritics (matras), the same key produces either:
//   - the standalone vowel carrier (at start of word / after another vowel carrier)
//   - the combining matra (after a consonant)
// In first-letter search mode only consonants/carriers matter, so context is irrelevant there.

export const ROMAN_TO_GURMUKHI: Record<string, string> = {
  // ── Vowel carriers (standalone) ──────────────────────────────────────────
  'a':  'ਅ',   // akaar — central vowel carrier
  'A':  'ਆ',   // long aa (same carrier, different vowel sound; treated as ਅ start for FL search)
  'i':  'ਇ',   // short i (ੲ-based)
  'I':  'ਈ',   // long ii
  'u':  'ੳ',   // oora — the u/o vowel carrier
  'U':  'ਊ',   // long uu
  'e':  'ਏ',   // e vowel
  'E':  'ਐ',   // ai vowel
  'o':  'ਓ',   // o vowel
  'O':  'ਔ',   // au vowel

  // ── Sibilants / gutturals ─────────────────────────────────────────────────
  's':  'ਸ',
  'S':  'ਸ਼',  // sha (ਸ + nukta)
  'h':  'ਹ',

  // ── Velars ────────────────────────────────────────────────────────────────
  'k':  'ਕ',
  'K':  'ਖ',
  'g':  'ਗ',
  'G':  'ਘ',

  // ── Palatals ──────────────────────────────────────────────────────────────
  'c':  'ਚ',
  'C':  'ਛ',
  'j':  'ਜ',
  'J':  'ਝ',

  // ── Retroflexes ───────────────────────────────────────────────────────────
  't':  'ਟ',
  'T':  'ਠ',
  'd':  'ਡ',
  'D':  'ਢ',
  'N':  'ਣ',

  // ── Dentals ───────────────────────────────────────────────────────────────
  'q':  'ਤ',
  'Q':  'ਥ',
  'z':  'ਦ',
  'Z':  'ਧ',
  'n':  'ਨ',

  // ── Labials ───────────────────────────────────────────────────────────────
  'p':  'ਪ',
  'P':  'ਫ',
  'f':  'ਫ਼',  // fa (ਫ + nukta) — for Persian loanwords
  'b':  'ਬ',
  'B':  'ਭ',
  'm':  'ਮ',

  // ── Sonorants ─────────────────────────────────────────────────────────────
  'X':  'ਯ',   // yaya (Y key was taken in many layouts; igurbani uses X)
  'r':  'ਰ',
  'l':  'ਲ',
  'v':  'ਵ',
  'w':  'ਵ',   // alternate for vava
  'R':  'ੜ',   // hakka rara (rare retroflex R)
  'L':  'ਲ਼',  // lla with nukta

  // ── Combining matras (vowel signs) ────────────────────────────────────────
  // These are only meaningful in full-word pattern input, not first-letter search.
  // 'a' after a consonant in a pattern would mean ਾ, but we handle that in the
  // pattern compiler by context, not here.

  // ── Other marks ───────────────────────────────────────────────────────────
  'M':  'ਂ',   // bindi
  '^':  'ੰ',   // tippi
  'W':  'ੱ',   // addak (gemination)
  ':':  'ਃ',   // visarg
  '~':  '੍',   // virama (sub-consonant joiner)
};

// Map a sequence of roman characters to Gurmukhi string.
// Used for first-letter search: each roman char → one Gurmukhi char.
export function romanToGurmukhi(roman: string): string {
  return roman
    .split('')
    .map(ch => ROMAN_TO_GURMUKHI[ch] ?? ch)
    .join('');
}

// Returns true if the character is a roman ASCII letter (input trigger).
export function isRomanLetter(ch: string): boolean {
  return /^[a-zA-Z~^:W]$/.test(ch);
}

// Returns the Gurmukhi character for a roman key, or null if not mapped.
export function lookupRoman(ch: string): string | null {
  return ROMAN_TO_GURMUKHI[ch] ?? null;
}

// Reverse map: Gurmukhi char → display hint for the roman key
export const GURMUKHI_TO_ROMAN: Record<string, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_GURMUKHI)
    .filter(([, v]) => v.length === 1) // only single-char targets
    .map(([k, v]) => [v, k])
);
