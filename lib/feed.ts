// Landing feeds: every shabad in reading order (Gurbani view) and every word
// by frequency (Dictionary view), paged without limit.
//
// Both page with a keyset cursor, never an offset, so page 3,000 costs the
// same as page 1: the cursor names the last row returned and each query reads
// forward from it along an index — lines_corpus_rank_ang (kosh 031) for lines,
// words_frequency_rank (kosh 046) for words.

import type { LineWithMeta, Word } from './supabase';

export const FEED_PAGE = 20;

export type FeedLine = LineWithMeta & { corpus_rank: number; source_fk: number };

// ─── Cursors ─────────────────────────────────────────────────────────────────

export type LineCursor = { rank: number; ang: number; line: number };
export type WordCursor = { frequency: number; id: number };

const nonNegInts = (s: string | null | undefined, n: number): number[] | null => {
  const parts = (s ?? '').split('.');
  if (parts.length !== n || !parts.every(p => /^\d+$/.test(p))) return null;
  return parts.map(Number);
};

export const encodeLineCursor = (c: LineCursor) => `${c.rank}.${c.ang}.${c.line}`;
export function decodeLineCursor(s: string | null | undefined): LineCursor | null {
  const v = nonNegInts(s, 3);
  return v && { rank: v[0], ang: v[1], line: v[2] };
}

export const encodeWordCursor = (c: WordCursor) => `${c.frequency}.${c.id}`;
export function decodeWordCursor(s: string | null | undefined): WordCursor | null {
  const v = nonNegInts(s, 2);
  return v && { frequency: v[0], id: v[1] };
}

// ─── Shabad grouping ─────────────────────────────────────────────────────────

export type ShabadGroup = { key: string; lines: FeedLine[] };

// Sri Sarbloh Granth has no shabad ids, so its lines group by ang instead.
const groupKey = (l: FeedLine) =>
  l.shabad_id != null ? `s${l.shabad_id}` : `a${l.source_fk}:${l.ang}`;

function group(lines: FeedLine[]): ShabadGroup[] {
  const groups: ShabadGroup[] = [];
  for (const l of lines) {
    const key = groupKey(l);
    const last = groups.at(-1);
    if (last?.key === key) last.lines.push(l);
    else groups.push({ key, lines: [l] });
  }
  return groups;
}

// Takes up to `n` whole shabads from lines read in reading order. When the
// read was cut off by its limit (`batchFull`), the last shabad may continue
// past it, so it's held back for the next page — unless it's the only one (a
// shabad longer than a whole batch), which is returned in part and continued
// on the next page; mergeGroups stitches it back together.
export function takeShabads(lines: FeedLine[], n: number, batchFull: boolean) {
  let groups = group(lines);
  const all = groups.length;
  if (batchFull && groups.length > 1 && groups.length <= n) groups = groups.slice(0, -1);
  groups = groups.slice(0, n);
  const last = groups.at(-1)?.lines.at(-1);
  return {
    groups,
    cursor: last ? { rank: last.corpus_rank, ang: last.ang, line: last.line_no } : null,
    done: !batchFull && groups.length === all,
  };
}

export function mergeGroups(existing: ShabadGroup[], incoming: ShabadGroup[]): ShabadGroup[] {
  const tail = existing.at(-1);
  if (tail && incoming[0]?.key === tail.key) {
    return [...existing.slice(0, -1), { key: tail.key, lines: [...tail.lines, ...incoming[0].lines] }, ...incoming.slice(1)];
  }
  return [...existing, ...incoming];
}

// ─── Lead line ───────────────────────────────────────────────────────────────

// A feed card shows one line per shabad, like a search result. Many shabads
// open with a heading rather than verse ("ਸਲੋਕੁ ॥", "ਪਉੜੀ ੧ (ਮੰਗਲਾਚਰਣ)",
// "ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥", "ਗਉੜੀ ਮਹਲਾ ੫ ॥"), and the data has no heading flag, so
// a line counts as one when it is very short or a short line naming a form.
// The length limit keeps the Mool Mantar, which ends in ਪ੍ਰਸਾਦਿ, as verse.
const HEADING_WORD = /ਛੰਦ|ਸਲੋਕ|ਪਉੜੀ|ਮਹਲਾ|ਪ੍ਰਸਾਦਿ|ਦੋਹ|ਸੋਰਠਾ|ਸਵੈਯਾ|ਸ੍ਵੈਯਾ|ਚੌਪਈ|ਚਉਪਈ|ਕਬਿੱਤ|ਕਬਿਤ/;
const HAS_LETTER = /[\u0A05-\u0A39\u0A72-\u0A74]/;

function isHeading(gurmukhi: string): boolean {
  const words = gurmukhi.split(/\s+/).filter(t => HAS_LETTER.test(t)).length;
  return words <= 3 || (words <= 6 && HEADING_WORD.test(gurmukhi));
}

// Index of the line a card leads with: the first that isn't a heading, or the
// first line if they all are.
export function leadLineIndex(lines: Pick<FeedLine, 'gurmukhi'>[]): number {
  const i = lines.findIndex(l => !isHeading(l.gurmukhi));
  return i === -1 ? 0 : i;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

// Just the supabase-js builder surface the feeds use.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = { from: (table: string) => any };

const LINE_SELECT =
  '*, shabads(raag_english, raag_gurmukhi, writer_english, writer_id, ang_start)';

// Lines after `after`, in reading order, from the selected scriptures. A
// keyset over three columns as one OR would defeat the index, so it's three
// forward reads, each a range on lines_corpus_rank_ang: the rest of the
// cursor's ang, the rest of its scripture, then the scriptures after it.
async function linesAfter(db: Db, sources: number[] | undefined, after: LineCursor | null, limit: number) {
  const base = () => {
    let q = db.from('lines').select(LINE_SELECT);
    if (sources?.length) q = q.in('source_fk', sources);
    return q;
  };
  const ordered = (q: any, n: number) =>
    q.order('corpus_rank', { ascending: true })
      .order('ang', { ascending: true })
      .order('line_no', { ascending: true })
      .limit(n);

  const steps = after
    ? [
        () => base().eq('corpus_rank', after.rank).eq('ang', after.ang).gt('line_no', after.line),
        () => base().eq('corpus_rank', after.rank).gt('ang', after.ang),
        () => base().gt('corpus_rank', after.rank),
      ]
    : [() => base()];

  const out: FeedLine[] = [];
  for (const step of steps) {
    if (out.length >= limit) break;
    const { data, error } = await ordered(step(), limit - out.length);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as FeedLine[]));
  }
  return out;
}

// Lines are read in batches until `n` whole shabads are in hand. 99% of SGGS
// shabads are under 50 lines, so one batch usually covers a page.
const LINE_BATCH = 400;
const MAX_BATCHES = 5;

export async function shabadPage(db: Db, sources: number[] | undefined, after: LineCursor | null, n = FEED_PAGE) {
  const lines: FeedLine[] = [];
  let cursor = after;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = await linesAfter(db, sources, cursor, LINE_BATCH);
    lines.push(...batch);
    const full = batch.length === LINE_BATCH;
    const page = takeShabads(lines, n, full);
    if (!full || page.groups.length >= n || i === MAX_BATCHES - 1) {
      return { shabads: page.groups, next: page.done || !page.cursor ? null : encodeLineCursor(page.cursor) };
    }
    const last = batch[batch.length - 1];
    cursor = { rank: last.corpus_rank, ang: last.ang, line: last.line_no };
  }
  return { shabads: [], next: null }; // unreachable: the last batch always returns
}

// Words by frequency, ties broken by id: the rest of the cursor's frequency,
// then everything rarer. One extra row says whether another page exists.
export async function wordPage(db: Db, after: WordCursor | null, n = FEED_PAGE) {
  const base = () => db.from('words').select('id, gurmukhi, frequency').eq('in_corpus', true);
  const steps = after
    ? [
        () => base().eq('frequency', after.frequency).gt('id', after.id).order('id', { ascending: true }),
        () => base().lt('frequency', after.frequency)
          .order('frequency', { ascending: false }).order('id', { ascending: true }),
      ]
    : [() => base().order('frequency', { ascending: false }).order('id', { ascending: true })];

  const words: Word[] = [];
  for (const step of steps) {
    if (words.length > n) break;
    const { data, error } = await step().limit(n + 1 - words.length);
    if (error) throw new Error(error.message);
    words.push(...((data ?? []) as Word[]));
  }
  const page = words.slice(0, n);
  const last = page.at(-1);
  return {
    words: page,
    next: words.length > n && last ? encodeWordCursor({ frequency: last.frequency, id: last.id }) : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
