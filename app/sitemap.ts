import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Build-time sitemap.xml generation (Technical SEO baseline). Deliberately
 * excludes /vs/instantly — that page is noindex'd and gated on the
 * seed-inbox placement feature shipping (Guardrails, Go-Live Checklist),
 * so it must not appear in the sitemap until it's unblocked.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/vs/smartlead',
    '/vs/lemlist',
    '/vs/woodpecker',
    '/vs/custom-n8n',
    '/compare/pricing',
    '/tools/domain-check',
    '/docs',
    '/docs/introduction',
    '/docs/quickstart',
    '/docs/guides/connecting-mailboxes',
    '/docs/guides/leads-and-enrichment',
    '/docs/guides/campaigns-ai-and-content-quality',
    '/docs/guides/sending-safely-and-domain-health',
    '/docs/guides/replies-and-team',
    '/docs/self-hosting/architecture',
    '/docs/self-hosting/backups-and-redis-durability',
    '/docs/self-hosting/tls-and-observability',
    '/docs/api-reference/auth-and-mailboxes',
    '/docs/api-reference/leads-and-campaigns',
    '/docs/api-reference/queue-domains-and-webhooks',
    '/docs/reference/guardrails-and-compliance',
    '/docs/reference/faq-and-changelog',
    '/docs/install-troubleshooting',
    '/docs/update-failures',
    '/docs/license-activation',
    '/docs/stripe-webhooks',
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
