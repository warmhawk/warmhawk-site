import { describe, expect, it } from 'vitest';
import { pageSeo, faqSchema, organizationSchema, softwareApplicationSchema, breadcrumbSchema } from './seo';
import { siteConfig } from './siteConfig';
import { tiers } from './tierConfig';

/**
 * Unit coverage for lib/seo.ts's shared metadata/schema builders — every
 * page on the site calls one or more of these, so a regression here would
 * silently break SEO/AEO/GEO coverage everywhere at once rather than on a
 * single page.
 */
describe('pageSeo', () => {
  it('builds an absolute canonical URL and appends the site name to the title, except on "/"', () => {
    const home = pageSeo({ title: 'Home title', description: 'd', path: '/' });
    expect(home.title).toEqual({ absolute: 'Home title' });
    expect(home.alternates?.canonical).toBe(`${siteConfig.url}/`);

    const sub = pageSeo({ title: 'Sub title', description: 'd', path: '/vs/smartlead' });
    expect(sub.title).toEqual({ absolute: `Sub title | ${siteConfig.name}` });
    expect(sub.alternates?.canonical).toBe(`${siteConfig.url}/vs/smartlead`);
  });

  it('defaults to indexable, and flips to noindex/nofollow when noIndex is passed', () => {
    const indexable = pageSeo({ title: 't', description: 'd', path: '/x' });
    expect(indexable.robots).toEqual({ index: true, follow: true });

    const gated = pageSeo({ title: 't', description: 'd', path: '/vs/instantly', noIndex: true });
    expect(gated.robots).toEqual({ index: false, follow: false });
  });

  it('carries the same title/description/OG image into both Open Graph and Twitter card metadata', () => {
    const meta = pageSeo({ title: 'A page', description: 'A description', path: '/a' });
    expect(meta.openGraph?.title).toBe(`A page | ${siteConfig.name}`);
    expect(meta.openGraph?.description).toBe('A description');
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: `A page | ${siteConfig.name}`,
      description: 'A description',
    });
  });
});

describe('faqSchema', () => {
  it('produces a schema.org FAQPage with one Question/Answer per item, in order', () => {
    const items = [
      { question: 'Q1?', answer: 'A1.' },
      { question: 'Q2?', answer: 'A2.' },
    ];
    const schema = faqSchema(items);

    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Q1?',
      acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
    });
  });
});

describe('organizationSchema', () => {
  it('includes the site URL and both the GitHub and Twitter profile links', () => {
    const schema = organizationSchema();
    expect(schema['@type']).toBe('Organization');
    expect(schema.url).toBe(siteConfig.url);
    expect(schema.sameAs).toContain('https://github.com/warmhawk');
    expect(schema.sameAs).toContain(`https://twitter.com/${siteConfig.twitter.replace(/^@/, '')}`);
  });
});

describe('softwareApplicationSchema', () => {
  it('emits one Offer per pricing tier, with a plain numeric price and an absolute URL', () => {
    const schema = softwareApplicationSchema();
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.offers).toHaveLength(tiers.length);

    const freeOffer = schema.offers.find((o) => o.name === 'Tier 0 — Open Core');
    expect(freeOffer?.price).toBe('0');
    expect(freeOffer?.priceCurrency).toBe('USD');
    expect(freeOffer?.url).toBe('https://github.com/warmhawk/warmhawk-core-engine');

    const proOffer = schema.offers.find((o) => o.name === 'Tier 1 — Self-Hosted Pro');
    expect(proOffer?.price).toBe('199');
    expect(proOffer?.url).toBe(`${siteConfig.url}/checkout?tier=1`);
  });

  it('never fabricates an aggregateRating or review', () => {
    const schema = softwareApplicationSchema();
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('review');
  });
});

describe('breadcrumbSchema', () => {
  it('builds a positioned ListItem per crumb, with absolute item URLs', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Docs', path: '/docs' },
      { name: 'Quickstart', path: '/docs/quickstart' },
    ]);

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${siteConfig.url}/`,
    });
    expect(schema.itemListElement[2]!.item).toBe(`${siteConfig.url}/docs/quickstart`);
  });
});
