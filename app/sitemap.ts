import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';
import { docsFlatOrder } from '@/lib/docsNav';

/**
 * Build-time sitemap.xml generation (Technical SEO baseline). Deliberately
 * excludes /vs/instantly — that page is noindex'd and gated on the
 * seed-inbox placement feature shipping (Guardrails, Go-Live Checklist),
 * so it must not appear in the sitemap until it's unblocked.
 *
 * The docs routes are derived from `docsFlatOrder` (lib/docsNav.ts) rather
 * than hand-listed here — that file is already the single source of truth
 * for the sidebar nav, prev/next order, and llms.txt (see that file's own
 * header comment), and a hand-duplicated list in this file was the one
 * remaining place a newly added doc page could go missing from the sitemap
 * without anything catching it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const docRoutes = ['/docs', ...docsFlatOrder.map((link) => link.href)];

  const routes = [
    '',
    '/vs/smartlead',
    '/vs/lemlist',
    '/vs/woodpecker',
    '/vs/custom-n8n',
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
