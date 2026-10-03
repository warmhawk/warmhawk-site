import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';
import { docsFlatOrder } from '@/lib/docsNav';
import { blogPosts } from '@/lib/blogPosts';
import { smtpErrors } from '@/lib/smtpErrors';

function isFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

/**
 * Sitemap.xml generation (Technical SEO baseline). /vs/instantly is included only once both of
 * app/vs/instantly/page.tsx's own gating flags are true — matches that page's real
 * (generateMetadata-driven) noindex state exactly, rather than a second, independently-maintained
 * exclusion list that could drift from it.
 *
 * The docs routes are derived from `docsFlatOrder` (lib/docsNav.ts) rather
 * than hand-listed here — that file is already the single source of truth
 * for the sidebar nav, prev/next order, and llms.txt (see that file's own
 * header comment), and a hand-duplicated list in this file was the one
 * remaining place a newly added doc page could go missing from the sitemap
 * without anything catching it.
 */
// Without this, `next build` prerenders sitemap.xml once, statically, using build-time env — see
// app/vs/instantly/page.tsx's own `dynamic` export comment for the full story.
export const dynamic = 'force-dynamic';

// Fixed per-page dates, not `new Date()`: stamping every URL with the build time told crawlers the
// whole site changed on every deploy. Each date is the page's last git commit (`git log -1
// --format=%cs -- <page source>`) written in as a literal, since Docker builds have no .git to read
// at build time. Bump a date here when you change that page's content; blog posts use their own
// `date` from lib/blogPosts.ts.
const FALLBACK_DATE = '2026-09-02';
const PAGE_DATES: Record<string, string> = {
  '': '2026-09-04',
  '/vs/instantly': '2026-09-02',
  '/vs/smartlead': '2026-09-02',
  '/vs/lemlist': '2026-09-08',
  '/vs/woodpecker': '2026-09-08',
  '/vs/custom-n8n': '2026-09-02',
  '/vs/inframail': '2026-09-08',
  '/vs/instantly-vs-smartlead-vs-lemlist': '2026-09-15',
  '/vs/instantly-alternatives': '2026-09-15',
  '/vs/warmbly': '2026-09-29',
  '/alternatives/self-hosted-cold-email': '2026-09-29',
  '/compare/pricing': '2026-10-02',
  '/tools/domain-check': '2026-09-06',
  '/tools/mx-checker': '2026-09-06',
  '/tools/spf-checker': '2026-09-06',
  '/tools/dkim-checker': '2026-09-06',
  '/tools/dmarc-checker': '2026-09-06',
  '/tools/blacklist-checker': '2026-09-06',
  '/tools/cold-email-calculator': '2026-09-29',
  '/errors': '2026-09-29',
  '/docs': '2026-09-07',
  '/docs/introduction': '2026-10-02',
  '/docs/quickstart': '2026-10-02',
  '/docs/guides/connecting-mailboxes': '2026-10-03',
  '/docs/guides/leads-and-enrichment': '2026-09-02',
  '/docs/guides/campaigns-ai-and-content-quality': '2026-10-02',
  '/docs/guides/sending-safely-and-domain-health': '2026-10-03',
  '/docs/guides/replies-and-team': '2026-09-02',
  '/docs/self-hosting/architecture': '2026-09-02',
  '/docs/self-hosting/backups-and-redis-durability': '2026-09-02',
  '/docs/self-hosting/tls-and-observability': '2026-09-02',
  '/docs/api-reference/auth-and-mailboxes': '2026-10-03',
  '/docs/api-reference/leads-and-campaigns': '2026-10-02',
  '/docs/api-reference/queue-domains-and-webhooks': '2026-10-03',
  '/docs/reference/guardrails-and-compliance': '2026-10-02',
  '/docs/reference/faq-and-changelog': '2026-09-29',
  '/docs/install-troubleshooting': '2026-09-02',
  '/docs/update-failures': '2026-09-02',
  '/docs/license-activation': '2026-09-02',
  '/docs/stripe-webhooks': '2026-10-02',
  '/legal/terms': '2026-09-02',
  '/legal/privacy': '2026-09-27',
  '/legal/acceptable-use': '2026-09-02',
  '/legal/dpa': '2026-09-02',
  '/security': '2026-09-27',
  '/status': '2026-09-27',
};
// One shared date for every /errors/<slug> page: they all render from lib/smtpErrors.ts.
const ERROR_ENTRIES_DATE = '2026-09-29';

function lastModifiedFor(route: string): string {
  if (route.startsWith('/errors/')) return ERROR_ENTRIES_DATE;
  if (route === '/blog') return blogPosts[0]?.date ?? FALLBACK_DATE;
  if (route.startsWith('/blog/')) {
    return blogPosts.find((post) => `/blog/${post.slug}` === route)?.date ?? FALLBACK_DATE;
  }
  return PAGE_DATES[route] ?? FALLBACK_DATE;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const docRoutes = ['/docs', ...docsFlatOrder.map((link) => link.href)];
  const blogRoutes = ['/blog', ...blogPosts.map((post) => `/blog/${post.slug}`)];
  const errorRoutes = ['/errors', ...smtpErrors.map((entry) => `/errors/${entry.slug}`)];
  const vsInstantlyLive =
    isFlagEnabled(process.env.ENABLE_VS_INSTANTLY) &&
    isFlagEnabled(process.env.SEED_PLACEMENT_LIVE_IN_PRODUCTION);

  const routes = [
    '',
    ...(vsInstantlyLive ? ['/vs/instantly'] : []),
    '/vs/smartlead',
    '/vs/lemlist',
    '/vs/woodpecker',
    '/vs/custom-n8n',
    '/vs/inframail',
    '/vs/instantly-vs-smartlead-vs-lemlist',
    '/vs/instantly-alternatives',
    '/vs/warmbly',
    '/alternatives/self-hosted-cold-email',
    '/compare/pricing',
    '/tools/domain-check',
    '/tools/mx-checker',
    '/tools/spf-checker',
    '/tools/dkim-checker',
    '/tools/dmarc-checker',
    '/tools/blacklist-checker',
    '/tools/cold-email-calculator',
    ...errorRoutes,
    ...docRoutes,
    ...blogRoutes,
    '/legal/terms',
    '/legal/privacy',
    '/legal/acceptable-use',
    '/legal/dpa',
    '/security',
    '/status',
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: lastModifiedFor(route),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
