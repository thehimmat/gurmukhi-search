// A highlight must start and end on whole Gurmukhi letters. A <mark> that
// ends after ਮ in ਮੋਹਿ leaves ੋ in its own text run, and the browser draws it
// on a dotted circle, splitting the word (gurmukhi-kosh#347). A letter here is
// a consonant or vowel with its marks, plus any pairin joined by a halant.

// Signs that sit on the letter before them: bindi/adhak/visarga, nukta, vowel
// signs, halant, udaat, tippi, addak, yakash.
const MARK = /[ਁ-ਃ਼ਾ-੍ੑੰੱੵ]/;
const HALANT = '੍';
const CONSONANT = /[ਕ-ਹਖ਼-ਫ਼]/;

// Does a letter continue at index i (so no span may begin or end just before it)?
function continues(text: string, i: number): boolean {
  if (i <= 0 || i >= text.length) return false;
  return MARK.test(text[i]) || (text[i - 1] === HALANT && CONSONANT.test(text[i]));
}

type Span = { start: number; end: number };

export function snapToClusters(text: string, spans: Span[]): Span[] {
  const snapped = spans.map(({ start, end }) => {
    while (continues(text, start)) start--;
    while (continues(text, end)) end++;
    return { start, end };
  });
  snapped.sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of snapped) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}
