import { describe, it, expect } from 'vitest';
import { submitTarget } from './kosh-submit';

const hits = [{ id: 1, gurmukhi: 'ਨਾਮੁ', frequency: 9 }];

describe('submitTarget (Dictionary Enter)', () => {
  it('opens the top hit when the results answer what is typed', () => {
    expect(submitTarget('ਨਾਮੁ', 'ਨਾਮੁ', hits)).toEqual({ kind: 'open', word: 'ਨਾਮੁ' });
    expect(submitTarget(' ਨਾਮੁ ', 'ਨਾਮੁ', hits)).toEqual({ kind: 'open', word: 'ਨਾਮੁ' });
  });
  it('looks the word up first when the results are for an earlier query', () => {
    expect(submitTarget('ਨਾਮੁ ਜਪ', 'ਨਾਮੁ', hits)).toEqual({ kind: 'lookup', query: 'ਨਾਮੁ ਜਪ' });
  });
  it('does nothing for an empty box or a settled query with no hits', () => {
    expect(submitTarget('   ', '', [])).toEqual({ kind: 'none' });
    expect(submitTarget('ਕਖ', 'ਕਖ', [])).toEqual({ kind: 'none' });
  });
});
