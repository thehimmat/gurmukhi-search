// Highlighting for exact Contains. kosh 066 matches the line and the query
// after Unicode NFD, so ਸ਼ stored as one code point and as ਸ + ਼ are the same
// text, and ਼ before ੍ whatever order the line stores them in. This mirrors
// that match to find where it falls in the original line — change both
// together (contains.test.ts holds vectors shaped like the migration's).

const NUKTA = '਼';
const HALANT = '੍';

// The only Gurmukhi marks NFD reorders, by canonical combining class.
const CCC: Record<string, number> = { [NUKTA]: 7, [HALANT]: 9 };

type Char = { ch: string; origin: number; len: number };

// NFD, keeping where each character came from in the original string.
function decompose(text: string): Char[] {
  const out: Char[] = [];
  let offset = 0;
  for (const cp of text) {
    for (const ch of cp.normalize('NFD')) out.push({ ch, origin: offset, len: cp.length });
    offset += cp.length;
  }
  // Canonical order: within a run of reorderable marks, lower class first.
  for (let i = 0; i < out.length; ) {
    let j = i;
    while (j < out.length && CCC[out[j].ch]) j++;
    if (j - i > 1) {
      const run = out.slice(i, j).sort((a, b) => CCC[a.ch] - CCC[b.ch]);
      out.splice(i, run.length, ...run);
    }
    i = j + 1;
  }
  return out;
}

// Every match of `needle` in `text`, as offsets into the original text.
export function containsSpans(text: string, needle: string): { start: number; end: number }[] {
  const n = needle.normalize('NFD');
  if (!n) return [];
  const chars = decompose(text);
  const hay = chars.map(c => c.ch).join('');
  // Same rule as the SQL: a plain letter must not run into a nukta (ਸ is not ਸ਼).
  const guarded = !n.endsWith(NUKTA);

  const spans: { start: number; end: number }[] = [];
  // Every NFD character here is one UTF-16 unit, so string and array indices agree.
  for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + 1)) {
    const after = i + n.length;
    if (guarded && hay[after] === NUKTA) continue;
    const hit = chars.slice(i, after);
    // A match that opens on a nukta takes its letter with it: a mark on its
    // own would be drawn apart from the letter it sits on.
    const first = hit[0].ch === NUKTA && i > 0 ? chars[i - 1] : hit[0];
    const start = Math.min(first.origin, ...hit.map(c => c.origin));
    const end = Math.max(...hit.map(c => c.origin + c.len));
    const last = spans[spans.length - 1];
    if (last && start < last.end) continue; // overlapping occurrence
    spans.push({ start, end });
  }
  return spans;
}
