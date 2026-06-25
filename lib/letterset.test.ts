import { describe, it, expect } from 'vitest';
import {
  matchesLetterSet,
  validateLetterSet,
  describeLetterSet,
  DEFAULT_LETTER_SET_QUERY,
  type LetterSetQuery,
} from './letterset';
import { parseSyllables } from './gurmukhi-chars';

// Helper: build a query from partial overrides on top of a strict base.
function q(overrides: Partial<LetterSetQuery> = {}): LetterSetQuery {
  return {
    letters: ['ਚ', 'ਸ', 'ਹ'],
    repeat: true,
    extra: 'none',
    wildcardSlots: 2,
    vowelMode: 'any',
    vowels: { mukta: true, signs: ['ਾ', 'ਿ', 'ੀ'] },
    allowNasalAddak: true,
    scope: 'word',
    ...overrides,
  };
}

describe('parseSyllables', () => {
  it('splits a word into base + vowel sign', () => {
    // ਚਾਹ = ਚ+ਾ (cha) then ਹ (h, mukta)
    expect(parseSyllables('ਚਾਹ')).toEqual([
      { base: 'ਚ', vowelSign: 'ਾ', marks: ['ਾ'] },
      { base: 'ਹ', vowelSign: null, marks: [] },
    ]);
  });

  it('treats addak as a mark, not a vowel', () => {
    // ਸੱਚ = ਸ + addak, then ਚ
    const syl = parseSyllables('ਸੱਚ');
    expect(syl[0].base).toBe('ਸ');
    expect(syl[0].vowelSign).toBeNull();
    expect(syl[1].base).toBe('ਚ');
  });

  it('keeps only the first matra as the vowel sign', () => {
    const syl = parseSyllables('ਸੂ');
    expect(syl[0].vowelSign).toBe('ੂ');
  });
});

describe('matchesLetterSet — strict (extra: none)', () => {
  it('matches words built only from rack letters (any vowel)', () => {
    expect(matchesLetterSet('ਸਹ', q())).toBe(true); // s + h
    expect(matchesLetterSet('ਹਸ', q())).toBe(true); // h + s
    expect(matchesLetterSet('ਸਚ', q())).toBe(true); // sach (truth)
    expect(matchesLetterSet('ਚਾਹ', q())).toBe(true); // ਚ+ਾ, ਹ
  });

  it('rejects words containing any letter outside the rack', () => {
    expect(matchesLetterSet('ਨਾਮ', q())).toBe(false); // naam — none in rack
    expect(matchesLetterSet('ਸਚਨ', q())).toBe(false); // trailing ਨ is outside
  });

  it('allows repeats by default', () => {
    expect(matchesLetterSet('ਸਸ', q())).toBe(true);
    expect(matchesLetterSet('ਹਹਹ', q())).toBe(true);
  });

  it('forbids repeats when repeat: false', () => {
    expect(matchesLetterSet('ਸਸ', q({ repeat: false }))).toBe(false);
    expect(matchesLetterSet('ਸਹ', q({ repeat: false }))).toBe(true); // each once
  });
});

describe('matchesLetterSet — vowel constraints (vowelMode: only)', () => {
  const onlyAaIEe = q({
    vowelMode: 'only',
    vowels: { mukta: true, signs: ['ਾ', 'ਿ', 'ੀ'] },
  });

  it('accepts mukta and the selected signs', () => {
    expect(matchesLetterSet('ਸਹ', onlyAaIEe)).toBe(true); // mukta + mukta
    expect(matchesLetterSet('ਚਾਹ', onlyAaIEe)).toBe(true); // ਾ allowed, ਹ mukta
    expect(matchesLetterSet('ਸਿਹ', onlyAaIEe)).toBe(true); // ਿ allowed
  });

  it('rejects a disallowed vowel sign', () => {
    expect(matchesLetterSet('ਸੂਹ', onlyAaIEe)).toBe(false); // ੂ not in set
  });

  it('rejects mukta when mukta is disabled', () => {
    const noMukta = q({
      vowelMode: 'only',
      vowels: { mukta: false, signs: ['ਾ'] },
    });
    expect(matchesLetterSet('ਸਹ', noMukta)).toBe(false); // both mukta
    expect(matchesLetterSet('ਸਾਹਾ', noMukta)).toBe(true); // both carry ਾ
  });

  it('any-vowel mode ignores vowel restrictions', () => {
    expect(matchesLetterSet('ਸੂਹ', q({ vowelMode: 'any' }))).toBe(true);
  });
});

describe('matchesLetterSet — limited wildcards', () => {
  const oneBlank = q({ letters: ['ਚ', 'ਸ'], extra: 'limited', wildcardSlots: 1 });

  it('allows up to N letters outside the rack', () => {
    expect(matchesLetterSet('ਸਚਨ', oneBlank)).toBe(true); // ਨ is the one blank
    expect(matchesLetterSet('ਸਚ', oneBlank)).toBe(true); // zero blanks used
  });

  it('rejects when exceptions exceed the slot budget', () => {
    expect(matchesLetterSet('ਸਚਨਮ', oneBlank)).toBe(false); // ਨ + ਮ = 2 > 1
  });

  it('requires at least one rack letter to be present', () => {
    expect(matchesLetterSet('ਨ', oneBlank)).toBe(false); // only a blank, no rack
  });
});

describe('matchesLetterSet — nasalization & addak toggle', () => {
  // ਹਾਂ = ਹ + ਾ + bindi;  ਸੱਚ = ਸ + addak + ਚ
  it('counts nasalized/geminated rack letters when allowNasalAddak is true', () => {
    expect(matchesLetterSet('ਹਾਂ', q({ allowNasalAddak: true }))).toBe(true);
    expect(matchesLetterSet('ਸੱਚ', q({ allowNasalAddak: true }))).toBe(true);
  });

  it('excludes them from "only these letters" when allowNasalAddak is false', () => {
    expect(matchesLetterSet('ਹਾਂ', q({ allowNasalAddak: false }))).toBe(false);
    expect(matchesLetterSet('ਸੱਚ', q({ allowNasalAddak: false }))).toBe(false);
    // plain forms without the marks still match
    expect(matchesLetterSet('ਸਚ', q({ allowNasalAddak: false }))).toBe(true);
  });

  it('treats a nasal/addak syllable as one wildcard when allowNasalAddak is false', () => {
    expect(
      matchesLetterSet('ਸੱਚ', q({ allowNasalAddak: false, extra: 'limited', wildcardSlots: 1 })),
    ).toBe(true);
  });
});

describe('matchesLetterSet — unlimited', () => {
  const anyOrder = q({ extra: 'unlimited' });

  it('requires every rack letter to appear, allows others', () => {
    expect(matchesLetterSet('ਚਸਹਨ', anyOrder)).toBe(true); // all three + ਨ
    expect(matchesLetterSet('ਨਚਾਸਹਮ', anyOrder)).toBe(true); // all three + extras
  });

  it('rejects when a rack letter is missing', () => {
    expect(matchesLetterSet('ਸਹਨ', anyOrder)).toBe(false); // no ਚ
  });
});

describe('validateLetterSet', () => {
  it('flags an empty rack', () => {
    expect(validateLetterSet(q({ letters: [] }))).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });

  it('flags only-vowel mode with no vowels and no mukta', () => {
    const res = validateLetterSet(
      q({ vowelMode: 'only', vowels: { mukta: false, signs: [] } }),
    );
    expect(res.ok).toBe(false);
  });

  it('accepts a well-formed query', () => {
    expect(validateLetterSet(q())).toEqual({ ok: true });
  });

  it('matchesLetterSet returns false for invalid queries', () => {
    expect(matchesLetterSet('ਸਹ', q({ letters: [] }))).toBe(false);
  });
});

describe('describeLetterSet', () => {
  it('summarises a strict word query', () => {
    const text = describeLetterSet(q());
    expect(text).toContain('ਚ ਸ ਹ');
    expect(text.toLowerCase()).toContain('only');
  });

  it('mentions wildcards for limited mode', () => {
    expect(describeLetterSet(q({ extra: 'limited', wildcardSlots: 2 }))).toContain('2');
  });

  it('has a sane default query', () => {
    expect(validateLetterSet({ ...DEFAULT_LETTER_SET_QUERY, letters: ['ਸ'] })).toEqual({
      ok: true,
    });
  });
});
