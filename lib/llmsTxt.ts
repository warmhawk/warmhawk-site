import { siteConfig, vsPages, footerLinks } from './siteConfig';
import { docsSections } from './docsNav';
import { tiers } from './tierConfig';
import { homeFaqItems, pricingFaqItems, domainCheckFaqItems } from './faqContent';

/**
 * Builds the content served at https://warmhawk.com/llms.txt — the
 * llms.txt convention (https://llmstxt.org) for pointing AI crawlers and
 * answer engines at a curated, machine-readable index of the site (GEO
 * baseline). Another product in this family ships this as a hand-maintained
 * static file under `public/llms.txt` (see its own header comment on the
 * pricing section: "This file is static and cannot import
 * packages/plan-limits/src/constants.ts — keep these numbers in sync with
 * it by hand"). WarmHawk takes the opposite approach on purpose: this
 * builds from the same `docsSections`, `vsPages`, `tiers`, and
 * `footerLinks` the rest of the site already renders from, so the doc
 * list, comparison pages, and pricing here cannot drift out of sync with
 * the real pages — exactly the "Single Source of Truth" failure mode
 * `lib/tierConfig.ts`'s own header comment warns about.
 *
 * Lives in lib/, not app/llms.txt/route.ts itself, because a Next.js route
 * file may only export the whitelisted route handlers (GET, POST, a
 * handful of route-config constants) — any other export fails the route's
 * own generated type check at build time.
 */
export function buildLlmsTxt(): string {
  const lines: string[] = [];

  lines.push(`# ${siteConfig.name}`);
  lines.push('');
  lines.push(`> ${siteConfig.description}`);
  lines.push('');
  lines.push(
    `${siteConfig.name} runs as a single-tenant stack on your own server, brought up with one command (\`curl -fsSL ${siteConfig.url}/install | bash\`). Tier 0 is a free, fully-functional sending engine reachable via direct API, no card required. Tier 1 adds a licensed operator dashboard and a founder-staffed support SLA for a flat monthly fee. Tier 2 is a done-for-you deployment ${siteConfig.name}'s founder runs on your behalf.`,
  );
  lines.push('');

  lines.push('## Docs');
  for (const section of docsSections) {
    for (const link of section.links) {
      lines.push(`- [${link.title}](${siteConfig.url}${link.href}): ${link.body}`);
    }
  }
  lines.push(
    `- [OpenAPI spec](${siteConfig.url}/openapi.json): Machine-readable OpenAPI 3.0.3 description of every documented /v1 route and the public domain-check endpoint, for coding agents and API clients.`,
  );
  lines.push('');

  lines.push('## Compare');
  for (const vs of vsPages) {
    lines.push(`- [${siteConfig.name} ${vs.label}](${siteConfig.url}/vs/${vs.slug})`);
  }
  lines.push(
    `- [Pricing comparison](${siteConfig.url}/compare/pricing): Full tier/feature matrix, billing mechanics, and cost-at-scale framing.`,
  );
  lines.push('');

  lines.push('## Tools');
  lines.push(
    `- [Free SPF, DKIM, DMARC & List-Unsubscribe checker](${siteConfig.url}/tools/domain-check): Instant PASS/FAIL results for any sending domain's deliverability setup, no account required.`,
  );
  lines.push('');

  lines.push('## Pricing');
  for (const tier of tiers) {
    const price = tier.priceSuffix ? `${tier.priceAmount}${tier.priceSuffix}` : tier.priceAmount;
    lines.push(`- ${tier.tierLabel} — ${price} — ${tier.priceNote}`);
  }
  lines.push('');
  lines.push(`Full pricing: ${siteConfig.url}/compare/pricing`);
  lines.push('');

  lines.push('## Trust');
  lines.push(`- [Security & coordinated disclosure](${siteConfig.url}/security)`);
  lines.push(`- [Status](${siteConfig.url}/status)`);
  lines.push('');

  lines.push('## Legal');
  for (const legal of footerLinks.legal) {
    lines.push(`- [${legal.label}](${siteConfig.url}${legal.href})`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Builds the content served at https://warmhawk.com/llms-full.txt — the
 * llms.txt convention's "full" companion file: the same index as
 * llms.txt, plus the actual FAQ answer text inlined so an agent can answer
 * from this one file without a second fetch per page.
 *
 * Pulls each page's FAQ content from `lib/faqContent.ts` — the same source
 * each page's own <FaqSection> renders from — rather than a second,
 * hand-copied FAQ list. Extend this list as more FAQ-bearing pages
 * (currently the /vs/* pages are the biggest gap) are worth inlining in
 * full; the index above already links every page regardless.
 */
export function buildLlmsFullTxt(): string {
  const sections: { title: string; items: { question: string; answer: string }[] }[] = [
    { title: 'Home', items: homeFaqItems },
    { title: 'Pricing', items: pricingFaqItems },
    { title: 'Domain check tool', items: domainCheckFaqItems },
  ];

  const lines: string[] = [buildLlmsTxt().trimEnd(), '', '## Full FAQ'];

  for (const section of sections) {
    lines.push('', `### ${section.title}`, '');
    for (const { question, answer } of section.items) {
      lines.push(`**${question}**`, '', answer, '');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}
