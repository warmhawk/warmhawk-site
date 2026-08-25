import { describe, expect, it } from 'vitest';
import sitemap from './sitemap';
import robots from './robots';

/**
 * Confirms the sitemap/robots gating logic (Technical SEO baseline):
 * /vs/instantly stays out of both sitemap.xml and robots.txt's crawlable
 * set until the seed-inbox placement feature it depends on ships. This
 * covers the same behavior a full `next build` would exercise, without
 * requiring the rest of the app (e.g. Stripe/license routes owned by
 * other in-flight work) to also compile.
 */
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
});

describe('robots()', () => {
  it('disallows /vs/instantly and /api/, and points at the real sitemap URL', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.disallow).toContain('/vs/instantly');
    expect(rule?.disallow).toContain('/api/');
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
