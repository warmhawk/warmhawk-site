import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';
import robots from './robots';

/**
 * Confirms the sitemap/robots gating logic (Technical SEO baseline):
 * /vs/instantly stays out of both sitemap.xml and robots.txt's crawlable
 * set until the seed-inbox placement feature it depends on ships, and
 * appears in both once it does (both env vars read fresh per call — see
 * robots.ts's getDisallow() and sitemap()'s own vsInstantlyLive — not
 * baked in at module-import time, so vi.stubEnv below actually takes
 * effect). This covers the same behavior a full `next build` would
 * exercise, without requiring the rest of the app (e.g. Stripe/license
 * routes owned by other in-flight work) to also compile.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sitemap()', () => {
  it('never includes /vs/instantly', () => {
    const routes = sitemap();
    expect(routes.some((route) => route.url.includes('/vs/instantly'))).toBe(false);
  });

  it('includes the other four /vs/* comparison pages', () => {
    const routes = sitemap();
    const urls = routes.map((route) => route.url);
    expect(urls.some((url) => url.endsWith('/vs/smartlead'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/vs/lemlist'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/vs/woodpecker'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/vs/custom-n8n'))).toBe(true);
  });

  it('gives the homepage the highest priority and weekly change frequency', () => {
    const routes = sitemap();
    const home = routes.find((route) => route.url === routes[0]?.url && route.priority === 1);
    expect(home).toBeDefined();
    expect(home?.changeFrequency).toBe('weekly');
  });

  it('includes /vs/instantly once both gating flags are true', () => {
    vi.stubEnv('ENABLE_VS_INSTANTLY', 'true');
    vi.stubEnv('SEED_PLACEMENT_LIVE_IN_PRODUCTION', 'true');
    const routes = sitemap();
    expect(routes.some((route) => route.url.endsWith('/vs/instantly'))).toBe(true);
  });

  it('still excludes /vs/instantly when only one of the two flags is true', () => {
    vi.stubEnv('ENABLE_VS_INSTANTLY', 'true');
    vi.stubEnv('SEED_PLACEMENT_LIVE_IN_PRODUCTION', 'false');
    const routes = sitemap();
    expect(routes.some((route) => route.url.endsWith('/vs/instantly'))).toBe(false);
  });
});

describe('robots()', () => {
  it('disallows /vs/instantly and /api/, and points at the real sitemap URL', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.userAgent).toBe('*');
    expect(rule?.disallow).toContain('/vs/instantly');
    expect(rule?.disallow).toContain('/api/');
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('repeats the wildcard rule for every named AI/answer-engine crawler, not just "*"', () => {
    // A crawler that matches a named user-agent group ignores the `*`
    // group entirely — an AI crawler entry missing `disallow` here would
    // silently see /vs/instantly and /api/, which the wildcard rule blocks.
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const aiCrawlers = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];

    for (const userAgent of aiCrawlers) {
      const rule = rules.find((r) => r?.userAgent === userAgent);
      expect(rule, `expected a robots rule for ${userAgent}`).toBeDefined();
      expect(rule?.allow).toBe('/');
      expect(rule?.disallow).toContain('/vs/instantly');
      expect(rule?.disallow).toContain('/api/');
    }
  });

  it('stops disallowing /vs/instantly once both gating flags are true', () => {
    vi.stubEnv('ENABLE_VS_INSTANTLY', 'true');
    vi.stubEnv('SEED_PLACEMENT_LIVE_IN_PRODUCTION', 'true');
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.disallow).not.toContain('/vs/instantly');
    expect(rule?.disallow).toContain('/api/');
  });
});
