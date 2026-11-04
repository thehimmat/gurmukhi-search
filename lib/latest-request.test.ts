import { describe, it, expect } from 'vitest';
import { LatestRequest } from './latest-request';

describe('LatestRequest', () => {
  it('aborts the previous request when a new one starts', () => {
    const r = new LatestRequest();
    const first = r.start();
    const second = r.start();
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
  });

  it('aborts the in-flight request on cancel, so a slow response for a cleared box is dropped', () => {
    const r = new LatestRequest();
    const s = r.start();
    r.cancel();
    expect(s.aborted).toBe(true);
  });

  it('can cancel with nothing in flight', () => {
    expect(() => new LatestRequest().cancel()).not.toThrow();
  });
});
