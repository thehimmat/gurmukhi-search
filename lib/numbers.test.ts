import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NUMBER_ROLES,
  NUMBER_ROLES,
  NUMBER_ROLE_LABELS,
  isNumericQuery,
  parseNumericQuery,
  toGurmukhiDigits,
} from './numbers';

describe('isNumericQuery', () => {
  it('is true only when the whole query is digits', () => {
    expect(isNumericQuery('੧')).toBe(true);
    expect(isNumericQuery('੧੦')).toBe(true);
    expect(isNumericQuery('  ੫ ')).toBe(true);
    // A Latin keyboard types ASCII; the igurbani layout has no digit keys, so
    // this is the common case rather than an edge case.
    expect(isNumericQuery('1')).toBe(true);
    expect(isNumericQuery('10')).toBe(true);
  });

  it('is false for words, empty input, and digits mixed with anything else', () => {
    expect(isNumericQuery('')).toBe(false);
    expect(isNumericQuery('   ')).toBe(false);
    expect(isNumericQuery('ਮਹਲਾ')).toBe(false);
    expect(isNumericQuery('ਮਹਲਾ ੧')).toBe(false);
    // A danda-wrapped tally is a regex/contains query, not a number query.
    expect(isNumericQuery('॥੧॥')).toBe(false);
    expect(isNumericQuery('੧.*')).toBe(false);
  });
});

describe('parseNumericQuery', () => {
  it('reads either script to the same integer', () => {
    expect(parseNumericQuery('੧')).toBe(1);
    expect(parseNumericQuery('੧੦')).toBe(10);
    expect(parseNumericQuery('10')).toBe(10);
    expect(parseNumericQuery('੧੭੯')).toBe(179);
    expect(parseNumericQuery('੦')).toBe(0);
  });

  it('returns null for a non-numeric query', () => {
    expect(parseNumericQuery('ਮਹਲਾ')).toBeNull();
    expect(parseNumericQuery('')).toBeNull();
    expect(parseNumericQuery('॥੧॥')).toBeNull();
  });
});

describe('toGurmukhiDigits', () => {
  it('renders an integer in Gurmukhi digits', () => {
    expect(toGurmukhiDigits(1)).toBe('੧');
    expect(toGurmukhiDigits(10)).toBe('੧੦');
    expect(toGurmukhiDigits(179)).toBe('੧੭੯');
  });

  it('round-trips with parseNumericQuery', () => {
    for (const n of [0, 1, 5, 10, 179, 2523]) {
      expect(parseNumericQuery(toGurmukhiDigits(n))).toBe(n);
    }
  });
});

describe('role vocabulary', () => {
  it('orders headings before verse markers', () => {
    expect([...NUMBER_ROLES]).toEqual(['author', 'ghar', 'heading_other', 'verse_marker']);
  });

  it('defaults to the heading roles, leaving verse markers opt-in', () => {
    expect([...DEFAULT_NUMBER_ROLES]).toEqual(['author', 'ghar', 'heading_other']);
    expect(DEFAULT_NUMBER_ROLES).not.toContain('verse_marker');
  });

  it('labels every role the RPC can return', () => {
    for (const role of NUMBER_ROLES) {
      expect(NUMBER_ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
