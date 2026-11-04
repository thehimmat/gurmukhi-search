import { describe, it, expect } from 'vitest';
import { clampAngRange } from './filters';

describe('clampAngRange', () => {
  it('leaves a valid range alone', () => {
    expect(clampAngRange(10, 20, 1430)).toEqual({ from: 10, to: 20 });
  });

  it('keeps empty ends empty', () => {
    expect(clampAngRange(undefined, undefined, 1430)).toEqual({ from: undefined, to: undefined });
    expect(clampAngRange(5, undefined, 1430)).toEqual({ from: 5, to: undefined });
    expect(clampAngRange(undefined, 9, 1430)).toEqual({ from: undefined, to: 9 });
  });

  it('clamps each end into 1..max', () => {
    expect(clampAngRange(0, 5000, 1430)).toEqual({ from: 1, to: 1430 });
    expect(clampAngRange(-3, undefined, 1430)).toEqual({ from: 1, to: undefined });
  });

  it('swaps a reversed range', () => {
    expect(clampAngRange(200, 100, 1430)).toEqual({ from: 100, to: 200 });
  });

  it('drops fractions and treats NaN as empty', () => {
    expect(clampAngRange(2.7, 9.2, 1430)).toEqual({ from: 2, to: 9 });
    expect(clampAngRange(NaN, 4, 1430)).toEqual({ from: undefined, to: 4 });
  });
});
