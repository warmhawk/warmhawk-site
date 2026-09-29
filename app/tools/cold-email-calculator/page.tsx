import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbSchema, pageSeo, webApplicationSchema } from '@/lib/seo';
import { PRICING_VERIFIED_ON } from '@/lib/competitorPricing';
import { AnswerBlock } from '@/components/AnswerBlock';
import { ColdEmailCalculator } from '@/components/ColdEmailCalculator';
import { FaqSection } from '@/components/FaqSchema';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// Sizing + cost calculator. The math lives in lib/coldEmailCalculator.ts and the prices in
// lib/competitorPricing.ts — this page is copy and layout only.

const TOOL_NAME = 'Cold Email Calculator: Domains, Mailboxes & Cost';
const TOOL_DESCRIPTION =
  'Enter how many cold emails you send a month and see how many domains and mailboxes you need, and what it costs on Instantly, Smartlead, Lemlist and self-hosted WarmHawk.';

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/cold-email-calculator',
});

const faqItems = [
  {
    question: 'How many emails can one mailbox send a day for cold email?',
    answer:
      'Most deliverability guides settle on about 30 cold emails per mailbox per day once the mailbox is warmed, with new mailboxes starting far lower. Google and Microsoft allow much more for normal mail, but cold volume near those limits gets filtered long before it gets blocked. The calculator defaults to 30; change it under Assumptions.',
  },
  {
    question: 'How many mailboxes should I put on one domain?',
    answer:
      'Two or three. More mailboxes per domain means fewer domains to buy, but a spam complaint or blocklisting hits the domain, not the mailbox, so every mailbox on it suffers together. Keeping it to three per domain limits the damage when one domain goes bad.',
  },
  {
    question: 'Why do all the tools share the same mailbox and domain cost?',
    answer:
      'Instantly, Smartlead, Lemlist and WarmHawk all send through mailboxes you own, usually Google Workspace or Microsoft 365 seats on domains you register. Those costs follow you whichever tool you pick, so the calculator adds them to every total rather than making one tool look cheaper by leaving them out.',
  },
  {
    question: 'Is WarmHawk cheaper than Instantly or Smartlead?',
    answer:
      'Not at low volume. With 3-step sequences, a $39–$97 SaaS plan beats WarmHawk Tier 1’s $199 flat fee up to about 75,000 emails a month, and Smartlead stays under it until 150,000. Past those points Instantly moves to $358, Lemlist to per-user pricing and Smartlead to $379, while Tier 1 stays $199. The free Tier 0 engine is cheapest at any volume if you can work from its API.',
  },
  {
    question: 'How current are these prices?',
    answer: `Every SaaS price was read from the vendor's own pricing page on ${PRICING_VERIFIED_ON}, monthly billing, and each vendor name above the table links to that page. Annual billing is 17–20% cheaper on all three. Enterprise and custom plans are not shown, because they have no public price.`,
  },
];

export default function ColdEmailCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            webApplicationSchema({
              name: TOOL_NAME,
              description: TOOL_DESCRIPTION,
              path: '/tools/cold-email-calculator',
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Cold email calculator', path: '/tools/cold-email-calculator' },
            ]),
          ]),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">Cold email calculator · free, no signup</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            How many domains and mailboxes do you need, and what will it cost?
          </h1>
          <AnswerBlock>
            Divide your monthly cold emails by about 30 sends per mailbox per day and 22 sending
            days to get mailboxes, then by 3 mailboxes per domain to get domains. 20,000 emails a
            month needs 31 mailboxes on 11 domains. Enter your volume below to compare the full
            monthly cost on Instantly, Smartlead, Lemlist and WarmHawk.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-12">
        <ColdEmailCalculator />
      </div>

      <div className="wrap pb-12 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold mb-4">How the math works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-[15px] leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">Mailboxes</strong> = emails per month &divide; (emails per
            mailbox per day &times; sending days), rounded up.
          </li>
          <li>
            <strong className="text-ink">Domains</strong> = mailboxes &divide; mailboxes per domain,
            rounded up.
          </li>
          <li>
            <strong className="text-ink">Software</strong> = the cheapest public plan whose monthly
            email cap and active-contact cap both fit. Contacts = emails &divide; emails per
            contact.
          </li>
          <li>
            <strong className="text-ink">Total</strong> = software + mailboxes + domains (yearly
            price &divide; 12). WarmHawk adds your server.
          </li>
        </ol>
        <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">
          Before you buy domains, run them through the{' '}
          <Link href="/tools/domain-check" className="text-rust font-semibold">
            free domain health check
          </Link>
          . If a campaign starts bouncing, paste the bounce into the{' '}
          <Link href="/errors" className="text-rust font-semibold">
            bounce decoder
          </Link>
          . For the reasoning behind the defaults, read{' '}
          <Link href="/blog/how-many-domains-for-cold-email" className="text-rust font-semibold">
            how many domains you need for cold email
          </Link>
          .
        </p>
      </div>

      <ToolCrossLinks current="/tools/cold-email-calculator" />

      <FaqSection items={faqItems} title="Cold email calculator FAQ" />
    </>
  );
}
