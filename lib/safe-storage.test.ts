import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeGet, safeSet } from './safe-storage';

afterEach(() => vi.unstubAllGlobals());

describe('safeStorage', () => {
  it('reads and writes localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    safeSet('k', 'v');
    expect(safeGet('k')).toBe('v');
  });

  it('reads null and writes nothing when storage throws (Safari private mode, webviews)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new DOMException('denied', 'SecurityError'); },
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
    });
    expect(safeGet('k')).toBeNull();
    expect(() => safeSet('k', 'v')).not.toThrow();
  });

  it('reads null when there is no storage at all (server render)', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(safeGet('k')).toBeNull();
    expect(() => safeSet('k', 'v')).not.toThrow();
  });
});
