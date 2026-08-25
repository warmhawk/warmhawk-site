import { test, expect } from '@playwright/test';

// Blanket coverage for every marketing/docs/legal page in the site (~35
// routes, per `find app -name page.tsx`) without 35 near-duplicate spec
// files: one route list, one parametrized test body. Each route gets its
// own named `test()` (not a single test looping internally) so a failure
// reports exactly which route broke instead of just "route-smoke failed".
//
// `/vs/instantly` is the one deliberate exception: it real-404s via
// `notFound()` unless `ENABLE_VS_INSTANTLY=true` is set (see
// app/vs/instantly/page.tsx and lib/siteConfig.ts), and this repo's
// `.env.local.docker` / the running container leave it unset on purpose —
// see README.md's "`/vs/instantly` — do not publish yet" section. So this
// route is asserted to 404, not 200 — a silent flip to 200 here would mean
// the page shipped live without anyone updating this test, which is exactly
// the kind of regression this file exists to catch.
const routes: { path: string; expectedStatus: 200 | 404 }[] = [
  { path: '/', expectedStatus: 200 },
  { path: '/compare/pricing', expectedStatus: 200 },
  { path: '/security', expectedStatus: 200 },
  { path: '/status', expectedStatus: 200 },
  { path: '/tools/domain-check', expectedStatus: 200 },
  { path: '/checkout', expectedStatus: 200 },

  { path: '/docs', expectedStatus: 200 },
  { path: '/docs/introduction', expectedStatus: 200 },
  { path: '/docs/quickstart', expectedStatus: 200 },
  { path: '/docs/guides/connecting-mailboxes', expectedStatus: 200 },
  { path: '/docs/guides/leads-and-enrichment', expectedStatus: 200 },
  { path: '/docs/guides/campaigns-ai-and-content-quality', expectedStatus: 200 },
  { path: '/docs/guides/sending-safely-and-domain-health', expectedStatus: 200 },
  { path: '/docs/guides/replies-and-team', expectedStatus: 200 },
  { path: '/docs/self-hosting/architecture', expectedStatus: 200 },
  { path: '/docs/self-hosting/backups-and-redis-durability', expectedStatus: 200 },
  { path: '/docs/self-hosting/tls-and-observability', expectedStatus: 200 },
  { path: '/docs/api-reference/auth-and-mailboxes', expectedStatus: 200 },
  { path: '/docs/api-reference/leads-and-campaigns', expectedStatus: 200 },
  { path: '/docs/api-reference/queue-domains-and-webhooks', expectedStatus: 200 },
  { path: '/docs/reference/guardrails-and-compliance', expectedStatus: 200 },
  { path: '/docs/reference/faq-and-changelog', expectedStatus: 200 },
  { path: '/docs/install-troubleshooting', expectedStatus: 200 },
  { path: '/docs/update-failures', expectedStatus: 200 },
  { path: '/docs/license-activation', expectedStatus: 200 },
  { path: '/docs/stripe-webhooks', expectedStatus: 200 },

  { path: '/legal/privacy', expectedStatus: 200 },
  { path: '/legal/terms', expectedStatus: 200 },
  { path: '/legal/dpa', expectedStatus: 200 },
  { path: '/legal/acceptable-use', expectedStatus: 200 },

  { path: '/vs/smartlead', expectedStatus: 200 },
  { path: '/vs/lemlist', expectedStatus: 200 },
  { path: '/vs/woodpecker', expectedStatus: 200 },
  { path: '/vs/custom-n8n', expectedStatus: 200 },
  { path: '/vs/instantly', expectedStatus: 404 }, // intentional, see comment above
];

for (const { path, expectedStatus } of routes) {
  test(`${path} -> ${expectedStatus}, non-empty <title>, no thrown error`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.goto(path);
    expect(response?.status(), `${path} returned ${response?.status()}, expected ${expectedStatus}`).toBe(
      expectedStatus,
    );

    const title = await page.title();
    expect(title.trim().length, `${path} has an empty <title>`).toBeGreaterThan(0);

    expect(pageErrors, `${path} threw an uncaught error:\n${pageErrors.join('\n')}`).toEqual([]);
  });
}
