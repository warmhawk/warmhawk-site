import type { Metadata } from 'next';
import { siteConfig } from './siteConfig';

interface PageSeoInput {
  title: string;
  description: string;
  path: string; // e.g. "/vs/instantly"
  noIndex?: boolean;
}

/**
 * Shared metadata builder — every page in the site calls this so Open
 * Graph, Twitter Card, and canonical-URL coverage (Comparison & SEO/AEO
 * Pages, Technical SEO baseline) is uniform site-wide rather than
 * hand-repeated per page.
 */
export function pageSeo({ title, description, path, noIndex }: PageSeoInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = path === '/' ? title : `${title} | ${siteConfig.name}`;

  return {
    // `{ absolute }` opts out of the root layout's `title.template` (`%s | WarmHawk`) — fullTitle
    // above already appends the site name itself, so applying the template on top of it produced
    // a doubled/tripled suffix (e.g. "Introduction | WarmHawk | WarmHawk").
    title: { absolute: fullTitle },
    description,
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: 'website',
      images: [
        {
          url: `${siteConfig.url}/og-image.png`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: siteConfig.twitter,
      images: [`${siteConfig.url}/og-image.png`],
    },
  };
}

/** FAQPage JSON-LD structured data, for the AEO baseline (question-shaped
 * headings + machine-readable schema so answer engines can cite this page
 * directly). Render the returned object inside a <script type="application/ld+json">. */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
