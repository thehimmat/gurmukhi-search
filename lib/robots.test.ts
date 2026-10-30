// robots.txt for search.atthebunga.com (Oct 2026 Hobby overage: crawlers walking every word x tab
// x occurrences page). Cloudflare prepends its managed AI-crawler block to whatever this serves.
import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

const rules = () => {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
};
const forAgent = (ua: string) => rules().find((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes(ua));
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

describe('robots.txt', () => {
  it('lets every crawler read the base dictionary and viewer pages', () => {
    const all = forAgent('*')!;
    expect(list(all.allow)).toContain('/');
    for (const path of ['/word/', '/line/', '/ang/']) {
      expect(list(all.disallow).some((d) => d === path || d === path.slice(0, -1))).toBe(false);
    }
  });

  it('keeps crawlers off the endless variants: tabs, occurrence pages, curator links, the ang view of a line', () => {
    const disallow = list(forAgent('*')!.disallow);
    for (const d of ['/*?*tab=', '/*?*page=', '/*?*key=', '/line/*/ang']) expect(disallow).toContain(d);
  });

  it('keeps crawlers off admin, health and the JSON API', () => {
    const disallow = list(forAgent('*')!.disallow);
    for (const d of ['/admin/', '/health', '/api/']) expect(disallow).toContain(d);
  });

  it('turns away SEO crawlers entirely (SemrushBot was the top agent before the pause)', () => {
    for (const ua of ['SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'DataForSeoBot']) {
      expect(list(forAgent(ua)?.disallow), ua).toEqual(['/']);
    }
  });
});
