import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /vs/instantly carries its own page-level noindex meta tag too
        // (belt-and-suspenders) — see Go-Live Checklist, "Content accuracy."
        disallow: ['/vs/instantly', '/api/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
