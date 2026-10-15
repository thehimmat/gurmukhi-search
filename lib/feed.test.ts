import { describe, it, expect } from 'vitest';
import { decodeLineCursor, encodeLineCursor, decodeWordCursor, encodeWordCursor, leadLineIndex, mergeGroups, takeShabads, type FeedLine } from './feed';

const line = (id: number, shabad: number | null, ang = 1, rank = 0, source = 1): FeedLine => ({
  id, verse_id: id, shabad_id: shabad, ang, line_no: id, corpus_rank: rank, source_fk: source,
  gurmukhi: `l${id}`, translation_en: null, transliteration_en: null, shabads: null,
});

describe('line cursor', () => {
  it('round-trips', () => {
    const c = { rank: 10, ang: 42, line: 7 };
    expect(decodeLineCursor(encodeLineCursor(c))).toEqual(c);
  });
  it('rejects junk', () => {
    for (const s of [null, '', '1.2', 'a.b.c', '1.2.3.4', '-1.2.3']) expect(decodeLineCursor(s)).toBeNull();
  });
});

describe('word cursor', () => {
  it('round-trips and rejects junk', () => {
    expect(decodeWordCursor(encodeWordCursor({ frequency: 3, id: 99 }))).toEqual({ frequency: 3, id: 99 });
    expect(decodeWordCursor('x')).toBeNull();
  });
});

describe('takeShabads', () => {
  const lines = [line(1, 1), line(2, 1), line(3, 2), line(4, 3), line(5, 3)];

  it('cuts at a shabad boundary and points the cursor at the last line taken', () => {
    const r = takeShabads(lines, 2, false);
    expect(r.groups.map(g => g.lines.map(l => l.id))).toEqual([[1, 2], [3]]);
    expect(r.cursor).toEqual({ rank: 0, ang: 1, line: 3 });
    expect(r.done).toBe(false);
  });

  it('holds back a possibly cut-off last shabad when the batch was full', () => {
    const r = takeShabads(lines, 20, true);
    expect(r.groups.map(g => g.key)).toEqual(['s1', 's2']);
    expect(r.done).toBe(false);
  });

  it('is done when the batch ran out and everything was taken', () => {
    const r = takeShabads(lines, 20, false);
    expect(r.groups).toHaveLength(3);
    expect(r.done).toBe(true);
  });

  it('returns part of a shabad longer than a whole batch rather than nothing', () => {
    const r = takeShabads([line(1, 9), line(2, 9)], 20, true);
    expect(r.groups.map(g => g.lines.length)).toEqual([2]);
    expect(r.cursor?.line).toBe(2);
  });

  it('groups lines without a shabad (Sarbloh) by ang', () => {
    const r = takeShabads([line(1, null, 5, 20, 4), line(2, null, 5, 20, 4), line(3, null, 6, 20, 4)], 20, false);
    expect(r.groups.map(g => g.lines.length)).toEqual([2, 1]);
  });
});

describe('mergeGroups', () => {
  it('joins a shabad continued across pages', () => {
    const a = takeShabads([line(1, 9)], 20, true).groups;
    const b = takeShabads([line(2, 9), line(3, 10)], 20, false).groups;
    expect(mergeGroups(a, b).map(g => g.lines.map(l => l.id))).toEqual([[1, 2], [3]]);
  });
});

describe('leadLineIndex', () => {
  const ls = (...g: string[]) => g.map((gurmukhi, i) => ({ gurmukhi, id: i }));

  it('is the first line when it is verse', () => {
    expect(leadLineIndex(ls('ਹੁਕਮੀ ਹੋਵਨਿ ਆਕਾਰ ਹੁਕਮੁ ਨ ਕਹਿਆ ਜਾਈ ॥', 'ਹੁਕਮੀ ਹੋਵਨਿ ਜੀਅ ॥'))).toBe(0);
  });

  it('keeps the Mool Mantar, which ends in ਪ੍ਰਸਾਦਿ but is not a heading', () => {
    expect(leadLineIndex(ls('ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥', '॥ ਜਪੁ ॥'))).toBe(0);
  });

  it.each([
    ['ਸਲੋਕੁ ॥'],
    ['ਪਉੜੀ ੧ (ਮੰਗਲਾਚਰਣ)'],
    ['ਭੁਜੰਗ ਪ੍ਰਯਾਤ ਛੰਦ ॥'],
    ['ਚਾਚਰੀ ਛੰਦ ॥ ਤ੍ਵ ਪ੍ਰਸਾਦਿ ॥'],
    ['ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥'],
    ['ਗਉੜੀ ਮਹਲਾ ੫ ॥'],
  ])('skips a heading line: %s', (heading) => {
    expect(leadLineIndex(ls(heading, 'ਪਵਣੁ ਗੁਰੂ ਪਾਣੀ ਪਿਤਾ ਮਾਤਾ ਧਰਤਿ ਮਹਤੁ ॥'))).toBe(1);
  });

  it('keeps a short verse line that is not a heading', () => {
    expect(leadLineIndex(ls('ਪੰਚ ਪਰਵਾਣ ਪੰਚ ਪਰਧਾਨੁ ॥', 'ਪੰਚੇ ਪਾਵਹਿ ਦਰਗਹਿ ਮਾਨੁ ॥'))).toBe(0);
  });

  it('falls back to the first line when every line is a heading', () => {
    expect(leadLineIndex(ls('ਸਲੋਕੁ ॥', 'ਦੋਹਰਾ ॥'))).toBe(0);
  });
});
