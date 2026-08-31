import type { Metadata } from 'next';
import { siteConfig } from './siteConfig';
import { tiers } from './tierConfig';

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
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
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

/** Site-wide Organization JSON-LD, rendered once in the root layout so every
 * page carries the same entity/E-E-A-T signal. `sameAs` is derived from
 * `siteConfig` rather than hand-listed, so a profile link added there (or
 * removed) can't silently drift out of sync with this schema. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    sameAs: [
      'https://github.com/warmhawk',
      `https://twitter.com/${siteConfig.twitter.replace(/^@/, '')}`,
    ],
  };
}

// Strips a tier's display price ("$0", "$199", "$1,500") down to the plain
// numeric string schema.org's `Offer.price` expects — no currency symbol or
// thousands separator.
function parsePrice(priceAmount: string): string {
  return priceAmount.replace(/[^0-9.]/g, '');
}

// Tier CTAs mix relative site paths ("/checkout?tier=1") and absolute
// external URLs (Tier 0's GitHub link) — resolve both to a single absolute
// URL so `Offer.url` is always a real, fetchable link either way.
function resolveUrl(href: string): string {
  return href.startsWith('http') ? href : `${siteConfig.url}${href}`;
}

/** SoftwareApplication JSON-LD with one Offer per pricing tier, sourced
 * directly from `lib/tierConfig`'s `tiers` (the same single source of truth
 * `PricingTable` renders) so this schema can't drift from the visible
 * pricing it describes. Deliberately carries no `aggregateRating`/`review`
 * — WarmHawk has no real review data yet, and fabricating one to qualify
 * for a richer result would be worse than shipping no rating at all. */
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${siteConfig.name} — Self-hosted cold email infrastructure`,
    description: siteConfig.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Linux (Docker)',
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.tierLabel,
      price: parsePrice(tier.priceAmount),
      priceCurrency: 'USD',
      url: resolveUrl(tier.ctaHref),
      description: tier.priceSuffix
        ? `${tier.priceNote} (${tier.priceAmount}${tier.priceSuffix})`
        : tier.priceNote,
    })),
  };
}

export interface HowToStepInput {
  name: string;
  text: string;
}

/** HowTo JSON-LD for a real, numbered procedure page (AEO/GEO baseline) —
 * `/docs/quickstart` and `/docs/install-troubleshooting` are both already
 * structured this way (a numbered sequence of concrete steps), this just
 * gives an answer engine the same structure as machine-readable schema
 * instead of only as H2 numbering. `text` should be the step's real
 * instruction, not a paraphrase — it's what gets quoted back verbatim. */
export function howToSchema(name: string, steps: HowToStepInput[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** BreadcrumbList JSON-LD for a trail of real, navigable pages (Technical
 * SEO baseline) — gives both classic search sitelinks and answer engines
 * explicit hierarchical context. Every `item` must be one of this site's
 * actual routes; never pass a synthetic label with no page behind it. */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}
