import { describe, it, expect } from 'vitest';
import config from '../next.config';

describe('kosh zone rewrites', () => {
  it('serves the line viewer from the kosh zone', async () => {
    const rw = await config.rewrites!();
    const after = (Array.isArray(rw) ? rw : rw.afterFiles) ?? [];
    expect(after.some((r) => r.source === '/line/:path*' && r.destination.endsWith('/line/:path*'))).toBe(true);
  });
});
