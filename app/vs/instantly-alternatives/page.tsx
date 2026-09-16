import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

// Same reasoning as the 3-way comparison page: the "Deliverability signal" row on
// app/vs/instantly/page.tsx is gated behind SEED_PLACEMENT_LIVE_IN_PRODUCTION because it asserts
// a production fact about WarmHawk that isn't confirmed live yet. This page is unconditionally
// indexed, so it reuses only the independent, already-sourced claims — support, billing,
// infrastructure — not the gated one.
const compareRows: CompareRow[] = [
  {
    label: 'Support SLA',
    them: 'Bot or slow, even at ~$400/mo',
    us: '1 business day, 4h for critical issues',
  },
  {
    label: 'Billing',
    them: 'Reports of double billing, denied refunds',
    us: 'Flat, self-hosted, 30-day money-back guarantee',
  },
  {
    label: 'Infrastructure',
    them: 'Shared multi-tenant SaaS',
    us: 'Your own containers, database, nginx, TLS',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'Instantly Alternatives (2026) — Compared, Including WarmHawk',
  description:
    'Looking for an Instantly alternative? A short, honest look at Smartlead, Lemlist, Woodpecker, Apollo, and a self-hosted DIY setup — plus the full case for WarmHawk, a flat-fee self-hosted alternative built around the same complaints Instantly users report.',
  path: '/vs/instantly-alternatives',
});

const faqItems = [
  {
    question: 'What is the best Instantly alternative?',
    answer:
      'It depends what you’re optimizing for. Smartlead is the closest like-for-like feature match. Lemlist adds a CRM-lite and lead database if you want an all-in-one tool. Apollo suits teams who want sourcing bundled with sending. WarmHawk is the alternative built specifically around the complaints Instantly users report most: a self-reported warmup score, slow support at a real price point, and shared multi-tenant infrastructure.',
  },
  {
    question: 'Why switch away from Instantly specifically?',
    answer:
      'The most commonly reported reasons are a warmup "heat score" that doesn’t reliably track real inbox placement, slow or bot-driven support even at a real monthly price, and billing issues including reports of double charges and denied refunds. None of these are universal experiences, but they show up repeatedly enough in Reddit, G2, and Trustpilot threads to be worth weighing before renewing.',
  },
  {
    question: 'Is a self-hosted alternative harder to set up than a SaaS tool like Instantly?',
    answer:
      'WarmHawk’s install is a single install.sh script that provisions the full stack — sending engine, database, monitoring — in one pass, typically live in under 10 minutes. It trades a few minutes of setup for owning the infrastructure outright, rather than trading setup time for a recurring multi-tenant SaaS bill.',
  },
  {
    question: 'Do any of these alternatives include warmup without an extra fee?',
    answer:
      'WarmHawk includes automated per-mailbox warmup on dedicated, per-customer infrastructure at no extra cost. Lemlist sells its warmup product, Lemwarm, separately. Smartlead and Instantly both run warmup through their own vendor-operated networks rather than isolated per-customer infrastructure.',
  },
];

export default function InstantlyAlternativesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />

      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-14 md:pb-16">
        <div className="label text-rust mb-5">Instantly Alternatives</div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          Looking for an Instantly alternative? Here&rsquo;s the honest short list.
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-9">
          If you&rsquo;re here because of a warmup score that doesn&rsquo;t match real placement, a
          slow support ticket, or a billing surprise, you&rsquo;re not alone &mdash; those are the
          three most commonly reported reasons people go looking for something else. Below is a
          short, real list of where to look, including the case for WarmHawk, which we think is
          worth reading since it was built specifically around these complaints.
        </p>
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link href="/checkout?tier=1" className="btn btn-primary">
            Start Tier 1 &mdash; $199/mo
          </Link>
          <Link href="/compare/pricing" className="btn btn-ghost">
            See full pricing
          </Link>
        </div>
        <AnswerBlock>
          The most commonly reported reasons people look for an Instantly alternative are a warmup
          score that doesn&rsquo;t track real inbox placement, slow support, and billing issues.
          Smartlead, Lemlist, Woodpecker, Apollo, and a self-hosted DIY setup each solve a different
          piece of that; WarmHawk was built around all three complaints directly.
        </AnswerBlock>
      </div>

      {/* SHORT ALTERNATIVES LIST */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-10">
            Five real options, one sentence each
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Smartlead</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                The closest like-for-like feature match to Instantly, though users report silent
                mid-send failures and add-ons that stack the effective bill 3-5x the advertised rate
                &mdash;{' '}
                <Link href="/vs/smartlead" className="text-rust font-semibold">
                  full comparison
                </Link>
                .
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Lemlist</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                Adds a CRM-lite, lead database, and image editor on top of sequencing, priced per
                seat, with warmup sold as a separate paid add-on &mdash;{' '}
                <Link href="/vs/lemlist" className="text-rust font-semibold">
                  full comparison
                </Link>
                .
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Woodpecker</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                A longer-established sequencing tool aimed more at agencies managing multiple client
                accounts than at solo cold-email operators &mdash;{' '}
                <Link href="/vs/woodpecker" className="text-rust font-semibold">
                  full comparison
                </Link>
                .
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Apollo</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                Bundles a large prospect database and sourcing with sending, which suits teams that
                want both in one subscription rather than sourcing leads separately.
              </p>
            </div>
            <div className="card bg-cream p-7 md:col-span-2">
              <div className="font-semibold text-base mb-2.5">Self-hosted / DIY (n8n, etc.)</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                Full control with no vendor lock-in, at the cost of building and maintaining your
                own sending, warmup, and monitoring logic from scratch &mdash;{' '}
                <Link href="/vs/custom-n8n" className="text-rust font-semibold">
                  what that actually takes
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WARMHAWK CASE */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
          The case for WarmHawk, specifically against Instantly&rsquo;s reported issues
        </h2>
        <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
          Checked against what Instantly&rsquo;s own users report on Reddit, G2, and Trustpilot.
        </p>

        <div className="mb-12">
          <CompareTable themLabel="Instantly" rows={compareRows} />
        </div>

        <AnswerBlock>
          Instantly customers paying roughly $400/month report support that&rsquo;s either a bot or
          slow to respond, according to user reports and G2 reviews. WarmHawk&rsquo;s support is
          founder-staffed at support@warmhawk.com: first response within 1 business day, and within
          4 business hours for critical issues.
        </AnswerBlock>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">Support at ~$400/month</div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="User reports, G2">
                Instantly customers describe support as either bot-driven or slow to respond, even
                at a roughly $400/month price point
              </StatCite>
              . WarmHawk&rsquo;s support is founder-staffed &mdash; a person reads and answers{' '}
              <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
                support@warmhawk.com
              </a>{' '}
              inside 1 business day, or 4 business hours for anything critical.
            </p>
          </div>
          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">Double billing, no refund</div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="Reddit/Trustpilot">
                Reddit and Trustpilot threads describe Instantly users hit with double billing and
                denied refunds on a metered SaaS platform
              </StatCite>
              . WarmHawk is self-hosted, so there&rsquo;s no metered platform billing layer that can
              double-charge in the first place, plus a 30-day money-back guarantee.
            </p>
          </div>
        </div>

        <p className="text-[15px] leading-relaxed text-ink-muted max-w-3xl mx-auto text-center mt-10">
          For the warmup-network reputation risk specifically &mdash; the mechanism behind
          Instantly&rsquo;s own reported reputation-blocking incidents &mdash; see{' '}
          <Link href="/blog/dedicated-ip-vs-shared-warmup-pool" className="text-rust font-semibold">
            dedicated IP vs shared warmup pool
          </Link>
          .
        </p>

        <ComparisonCallout />
      </div>

      <FaqSection
        items={faqItems}
        title="Instantly alternatives: questions worth answering up front"
      />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Built around the exact complaints you searched for.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Self-hosted, founder-supported, flat fee — try it with a 30-day guarantee.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1 &mdash; $199/mo
            </Link>
            <Link href="/docs/quickstart" className="btn btn-on-dark">
              Get the free engine
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
