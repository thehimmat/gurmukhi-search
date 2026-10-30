// The VM build (Dockerfile, .github/workflows/deploy.yml): a standalone server whose kosh-zone
// rewrites go to KOSH_ZONE_URL, set at build time to the kosh container (http://kosh:3000).
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function config() {
  return (await import('./next.config')).default;
}

describe('next.config', () => {
  it('emits a standalone server for the Docker image', async () => {
    expect((await config()).output).toBe('standalone');
  });

  it('sends the kosh zone paths to KOSH_ZONE_URL', async () => {
    vi.stubEnv('KOSH_ZONE_URL', 'http://kosh:3000');
    const rewrites = await (await config()).rewrites!();
    const afterFiles = (Array.isArray(rewrites) ? rewrites : rewrites.afterFiles) ?? [];
    expect(afterFiles).toContainEqual({ source: '/word/:path*', destination: 'http://kosh:3000/word/:path*' });
    expect(afterFiles).toContainEqual({ source: '/kosh-static/:path*', destination: 'http://kosh:3000/kosh-static/:path*' });
  });

  it('defaults to the Vercel deployment (Vercel builds, previews)', async () => {
    vi.stubEnv('KOSH_ZONE_URL', '');
    const rewrites = await (await config()).rewrites!();
    const afterFiles = (Array.isArray(rewrites) ? rewrites : rewrites.afterFiles) ?? [];
    expect(afterFiles[0].destination).toMatch(/^https:\/\/gurmukhi-kosh\.vercel\.app\//);
  });
});
