import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';
import { docsFlatOrder } from '@/lib/docsNav';

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

export default function sitemap(): MetadataRoute.Sitemap {
  const docRoutes = ['/docs', ...docsFlatOrder.map((link) => link.href)];
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
    '/compare/pricing',
    '/tools/domain-check',
    ...docRoutes,
    '/legal/terms',
    '/legal/privacy',
    '/legal/acceptable-use',
    '/legal/dpa',
    '/security',
    '/status',
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
