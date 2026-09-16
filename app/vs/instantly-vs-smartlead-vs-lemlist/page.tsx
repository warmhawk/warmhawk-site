import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

// Only the Instantly claims that don't depend on SEED_PLACEMENT_LIVE_IN_PRODUCTION are reused
// here. app/vs/instantly/page.tsx's own "Deliverability signal" row (placement sampling vs a
// self-reported score) is gated behind that flag specifically because it asserts a production
// fact about WarmHawk that isn't confirmed live yet — repeating it on this page, which has no
// such gate and is meant to be indexed, would resurrect the exact overclaiming risk that flag
// exists to prevent. Support SLA, billing, and infrastructure are independent, already-sourced
// claims used elsewhere on the live site (see ComparisonCallout), so they carry over safely.
const instantlyRows: CompareRow[] = [
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

const smartleadRows: CompareRow[] = [
  {
    label: 'Failure detection',
    them: 'Silent mid-send stalls, no notification',
    us: 'Uptime Kuma, 1-min checks, your own webhook alerts',
  },
  {
    label: 'Support SLA',
    them: 'Slow response is the #1 G2 complaint',
    us: '1 business day, 4h for critical issues',
  },
  {
    label: 'Pricing structure',
    them: 'Base plan + stacked paid add-ons',
    us: 'Flat $199/mo, monitoring & OTEL included',
  },
];

const lemlistRows: CompareRow[] = [
  {
    label: 'Pricing model',
    them: 'Per-seat, scales with team size',
    us: 'Flat $199/mo, unlimited users',
  },
  {
    label: 'Warmup',
    them: 'Lemwarm, separate paid add-on',
    us: 'Native, included',
  },
  {
    label: 'Send safety',
    them: 'Volumes reported as unsafe on new domains',
    us: '8-min cadence floor + jitter, enforced automatically',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'Instantly vs Smartlead vs Lemlist — and Where WarmHawk Fits',
  description:
    'A side-by-side look at Instantly, Smartlead, and Lemlist on pricing, warmup, support, and infrastructure — plus where a flat, self-hosted, single-tenant account like WarmHawk fits against all three.',
  path: '/vs/instantly-vs-smartlead-vs-lemlist',
});

const faqItems = [
  {
    question: 'Which of the three — Instantly, Smartlead, or Lemlist — is cheapest?',
    answer:
      'It depends what you count. Base sticker prices are broadly similar across all three, but Smartlead’s premium warmup and whitelabel add-ons, and Lemlist’s per-seat pricing, both push the real bill well above the advertised number as a team or add-on list grows. Instantly’s base price is more contained, but its warmup network carries the shared-pool reputation risk covered in WarmHawk’s own dedicated-IP comparison. WarmHawk is flat at $199/month with unlimited users and no paid add-on tier for any of these categories.',
  },
  {
    question: 'Which one has the best support?',
    answer:
      'Independently, users report slow or bot-driven support as a common complaint against both Instantly and Smartlead — it’s the #1-cited G2 complaint against Smartlead specifically. WarmHawk’s support is founder-staffed: 1 business day for a first response, 4 business hours for anything critical.',
  },
  {
    question: 'Do any of the three include warmup natively?',
    answer:
      'Instantly and Smartlead both run warmup through their own vendor-operated networks; Lemlist sells its warmup product, Lemwarm, as a separate paid add-on rather than bundling it. WarmHawk includes automated per-mailbox warmup for every connected mailbox at no extra cost, run on dedicated infrastructure with no shared-pool exposure.',
  },
  {
    question: 'Should I read the individual comparison pages instead of this one?',
    answer:
      'If you’ve already narrowed to one of the three, yes — the dedicated WarmHawk vs Smartlead and WarmHawk vs Lemlist pages go deeper on each specific vendor with more sourced detail than fits in a three-way table. This page is for comparing all three at once before narrowing down.',
  },
];

export default function InstantlyVsSmartleadVsLemlistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />

      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-14 md:pb-16">
        <div className="label text-rust mb-5">Instantly vs Smartlead vs Lemlist</div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          Three cold-email platforms, three different bills you didn&rsquo;t expect.
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-9">
          Instantly, Smartlead, and Lemlist all solve the same core problem &mdash; sequencing and
          sending cold email at scale &mdash; but each one has grown a different set of costs and
          tradeoffs on top of that core: a shared warmup network on one, stacked paid add-ons on
          another, per-seat pricing on the third. WarmHawk takes a fourth approach: one flat fee per
          account, self-hosted on infrastructure you own, with warmup, monitoring, and send safety
          built in rather than upsold.
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
          Instantly, Smartlead, and Lemlist each solve cold-email sequencing differently, but all
          three add cost or risk beyond the advertised base price: a shared warmup network, stacked
          paid add-ons, or per-seat billing, respectively. WarmHawk charges one flat $199/month per
          account, self-hosted, with warmup and send-safety controls included rather than sold
          separately.
        </AnswerBlock>
      </div>

      {/* INSTANTLY TABLE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            WarmHawk vs Instantly
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            Checked against what Instantly&rsquo;s own users report on Reddit, G2, and Trustpilot.
          </p>
          <div className="mb-8">
            <CompareTable themLabel="Instantly" rows={instantlyRows} />
          </div>
          <p className="text-[15px] leading-relaxed text-ink-muted max-w-3xl mx-auto text-center">
            <StatCite source="Reddit/Trustpilot">
              Reddit and Trustpilot threads describe Instantly users hit with double billing and
              denied refunds on a metered SaaS platform
            </StatCite>
            . For the full picture on Instantly&rsquo;s shared warmup network specifically, see{' '}
            <Link
              href="/blog/dedicated-ip-vs-shared-warmup-pool"
              className="text-rust font-semibold"
            >
              the dedicated-IP vs shared warmup pool breakdown
            </Link>
            .
          </p>
        </div>
      </div>

      {/* SMARTLEAD TABLE */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
          WarmHawk vs Smartlead
        </h2>
        <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
          None of this is a hit piece &mdash; it&rsquo;s what Smartlead&rsquo;s own users report.
        </p>
        <div className="mb-8">
          <CompareTable themLabel="Smartlead" rows={smartleadRows} />
        </div>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-3xl mx-auto text-center">
          <StatCite source="Cost breakdowns">
            Independent cost breakdowns show Smartlead&rsquo;s premium warmup, whitelabel, and other
            add-ons stacking the effective price to 3-5x the advertised base rate
          </StatCite>
          . Full detail on the failure-notification gap and the add-on math:{' '}
          <Link href="/vs/smartlead" className="text-rust font-semibold">
            WarmHawk vs Smartlead &rarr;
          </Link>
        </p>
      </div>

      {/* LEMLIST TABLE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            WarmHawk vs Lemlist
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            Per-seat pricing and a paywalled warmup add-on, checked against WarmHawk&rsquo;s flat
            account fee.
          </p>
          <div className="mb-8">
            <CompareTable themLabel="Lemlist" rows={lemlistRows} />
          </div>
          <p className="text-[15px] leading-relaxed text-ink-muted max-w-3xl mx-auto text-center">
            <StatCite source="User reviews">
              Reviewers regularly flag Lemwarm as an unexpected extra cost discovered only after
              signing up for Lemlist itself
            </StatCite>
            . Full breakdown of the per-seat math and send-safety comparison:{' '}
            <Link href="/vs/lemlist" className="text-rust font-semibold">
              WarmHawk vs Lemlist &rarr;
            </Link>
          </p>
        </div>
      </div>

      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[28px] font-semibold text-center mb-6">
          Where WarmHawk fits across all three
        </h2>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            Instantly, Smartlead, and Lemlist are all shared, multi-tenant SaaS platforms &mdash;
            every customer&rsquo;s sending infrastructure runs on the vendor&rsquo;s own servers,
            with per-customer isolation, where it exists at all, limited to the sending IP rather
            than the application, database, or network layer underneath it. WarmHawk instead gives
            every account its own complete infrastructure package: own containers, own database, own
            nginx, own TLS certificate, own Docker network, with nothing shared across customers or
            with WarmHawk itself.
          </p>
          <p>
            That single architectural difference is what produces the pricing, warmup, and
            monitoring differences in each table above &mdash; a per-customer install has no reason
            to bill per seat, no reason to sell warmup as an add-on, and no reason to leave you
            finding out about a failed send from a prospect instead of an alert.
          </p>
        </div>
        <ComparisonCallout />
      </div>

      <FaqSection
        items={faqItems}
        title="Instantly vs Smartlead vs Lemlist: questions worth answering up front"
      />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            One flat fee. Three fewer things to compare next renewal.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Self-hosted infrastructure, warmup included, nothing sold as an add-on.
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
