import type { MetadataRoute } from 'next';

// robots.txt for search.atthebunga.com, which also serves the kosh zone's /word, /line and /ang
// pages. Cloudflare prepends its managed block (AI training crawlers) to this. Crawlers may read
// each word, line and ang once; the variants multiply that without adding anything to an index:
// every word has seven tabs and its occurrences page through ?page=, and /line/<id>/ang repeats
// /ang/<n>. Walking those was most of the Oct 2026 Vercel Hobby overage.
const SEO_CRAWLERS = [
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Barkrowler',
  'serpstatbot',
  'SeekportBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/*?*tab=', '/*?*page=', '/*?*key=', '/line/*/ang', '/admin/', '/health', '/api/'],
      },
      { userAgent: SEO_CRAWLERS, disallow: ['/'] },
    ],
  };
}
