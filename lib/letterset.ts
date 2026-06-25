// Letter Set search — the "which words can I build from this set of letters?"
// model, inspired by Scrabble / Boggle / Wordle solvers.
//
// This is a pure predicate over a single word. The caller iterates the word
// list (see word-index.ts) and keeps the words for which matchesLetterSet()
// returns true. Keeping the logic in plain TS (rather than a Postgres regex)
// lets us express counting rules (no-repeats, wildcard budgets) and the
// alphasyllabary vowel rules precisely, and makes it trivially unit-testable.

import { parseSyllables, Syllable, NASAL_MARKS, ADDAK } from './gurmukhi-chars';

export type VowelMode = 'any' | 'only';
// What may appear besides the rack letters:
//   none      → only rack letters (subset-of-rack)
//   limited   → rack letters + up to `wildcardSlots` single-letter blanks
//   unlimited → must contain every rack letter; any other letters allowed
export type ExtraMode = 'none' | 'limited' | 'unlimited';
export type Scope = 'word' | 'line';

export type LetterSetQuery = {
  letters: string[]; // the rack, e.g. ['ਚ', 'ਸ', 'ਹ']
  repeat: boolean; // may a rack letter be reused? (sub-anagram when false)
  extra: ExtraMode;
  wildcardSlots: number; // blanks allowed when extra === 'limited' (1..3)
  vowelMode: VowelMode;
  vowels: { mukta: boolean; signs: string[] }; // used when vowelMode === 'only'
  // When true (default), nasalization (bindi/tippi) and addak are treated as
  // transparent diacritics — a nasalized/geminated rack letter still counts.
  // When false, any such mark makes a syllable fall outside "only these letters".
  allowNasalAddak: boolean;
  scope: Scope;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

// A sensible empty starting state for the builder UI.
export const DEFAULT_LETTER_SET_QUERY: LetterSetQuery = {
  letters: [],
  repeat: true,
  extra: 'none',
  wildcardSlots: 2,
  vowelMode: 'any',
  vowels: { mukta: true, signs: ['ਾ', 'ਿ', 'ੀ'] },
  allowNasalAddak: true,
  scope: 'word',
};

export function validateLetterSet(q: LetterSetQuery): ValidationResult {
  if (!q.letters || q.letters.length === 0) {
    return { ok: false, error: 'Add at least one letter to the set.' };
  }
  if (q.vowelMode === 'only' && !q.vowels.mukta && q.vowels.signs.length === 0) {
    return { ok: false, error: 'Select at least one vowel, or enable mukta (ə).' };
  }
  if (q.extra === 'limited' && q.wildcardSlots < 1) {
    return { ok: false, error: 'Choose at least one wildcard slot.' };
  }
  return { ok: true };
}

// Is this syllable's vowel permitted by the vowel settings?
// A null vowelSign means mukta (no attached matra).
function vowelAllowed(vowelSign: string | null, q: LetterSetQuery): boolean {
  if (q.vowelMode === 'any') return true;
  if (vowelSign === null) return q.vowels.mukta;
  return q.vowels.signs.includes(vowelSign);
}

// Does the syllable carry a nasal mark (bindi/tippi) or addak?
function hasNasalOrAddak(syl: Syllable): boolean {
  return syl.marks.some((m) => NASAL_MARKS.includes(m) || m === ADDAK);
}

// Core predicate. Returns true if `word` satisfies the letter-set query.
export function matchesLetterSet(word: string, q: LetterSetQuery): boolean {
  if (!validateLetterSet(q).ok) return false;

  const syllables = parseSyllables(word);
  if (syllables.length === 0) return false;

  const rack = new Set(q.letters);

  let exceptions = 0; // syllables that are not a "clean" rack letter
  let cleanCount = 0;
  const cleanUsage = new Map<string, number>(); // rack letter → clean-use count

  for (const syl of syllables) {
    const clean =
      rack.has(syl.base) &&
      vowelAllowed(syl.vowelSign, q) &&
      (q.allowNasalAddak || !hasNasalOrAddak(syl));
    if (clean) {
      cleanCount++;
      cleanUsage.set(syl.base, (cleanUsage.get(syl.base) ?? 0) + 1);
    } else {
      exceptions++;
    }
  }

  // No-repeat constraint (sub-anagram). Only meaningful for none / limited,
  // where the word is otherwise built from the rack.
  if (!q.repeat && (q.extra === 'none' || q.extra === 'limited')) {
    for (const count of cleanUsage.values()) {
      if (count > 1) return false;
    }
  }

  switch (q.extra) {
    case 'none':
      return exceptions === 0;
    case 'limited':
      return exceptions <= q.wildcardSlots && cleanCount >= 1;
    case 'unlimited':
      // Every rack letter must appear at least once as a clean syllable.
      for (const letter of rack) {
        if ((cleanUsage.get(letter) ?? 0) < 1) return false;
      }
      return true;
  }
}

// A short human-readable summary of the query, shown live in the builder UI.
export function describeLetterSet(q: LetterSetQuery): string {
  if (q.letters.length === 0) return 'Add letters to begin.';

  const letters = q.letters.join(' ');
  const target = q.scope === 'word' ? 'Words' : 'Lines with words';

  let body: string;
  switch (q.extra) {
    case 'none':
      body = `built only from ${letters}`;
      break;
    case 'limited':
      body = `built from ${letters} plus up to ${q.wildcardSlots} wildcard ${
        q.wildcardSlots === 1 ? 'letter' : 'letters'
      }`;
      break;
    case 'unlimited':
      body = `containing ${letters} (other letters allowed)`;
      break;
  }

  const repeatNote =
    q.extra !== 'unlimited' && !q.repeat ? ', each used at most once' : '';

  let vowelNote: string;
  if (q.vowelMode === 'any') {
    vowelNote = ' with any vowels';
  } else {
    const parts = [...(q.vowels.mukta ? ['ə'] : []), ...q.vowels.signs];
    vowelNote = parts.length ? ` with vowels ${parts.join(' ')}` : '';
  }

  return `${target} ${body}${repeatNote}${vowelNote}.`;
}
