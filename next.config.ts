import type { NextConfig } from "next";

// Multi-zone: this app is the shell for search.atthebunga.com. It owns the
// search UI (/ plus /api/search, /api/words, /api/meta); every dictionary path
// below is transparently served by the gurmukhi-kosh deployment (the deep
// dictionary: provenance, flagging, health, admin). Swapping the dictionary
// implementation = changing KOSH_ZONE_URL; see ../APP_INTERACTIONS.md.
const KOSH_ZONE_URL = process.env.KOSH_ZONE_URL ?? "https://gurmukhi-kosh.vercel.app";

const nextConfig: NextConfig = {
  transpilePackages: ['@atthebunga/gurmukhi-input'],

  async rewrites() {
    const koshPaths = [
      "/word/:path*",
      "/browse",
      "/ang/:path*",
      "/about",
      "/health",
      "/admin/:path*",
      "/api/word/:path*",
      "/api/flags",
      "/api/health",
      // The kosh zone's JS/CSS/fonts are namespaced under this prefix
      // (assetPrefix in gurmukhi-kosh/next.config.ts) so they never collide
      // with this shell's /_next/* on the shared domain.
      "/kosh-static/:path*",
    ];
    return {
      afterFiles: koshPaths.map((source) => ({
        source,
        destination: `${KOSH_ZONE_URL}${source}`,
      })),
    };
  },

  async redirects() {
    return [
      // kosh.atthebunga.com is decommissioned: permanently redirect every path
      // to the same path on search.atthebunga.com (word links keep working and
      // now land on the deep dictionary pages served by the kosh zone).
      {
        source: "/:path*",
        has: [{ type: "host", value: "kosh.atthebunga.com" }],
        destination: "https://search.atthebunga.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
