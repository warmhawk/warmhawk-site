import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageSeo } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { DoNotPublishComment } from '@/components/DoNotPublishComment';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

const compareRows: CompareRow[] = [
  {
    label: 'Deliverability signal',
    them: 'Self-reported warmup "heat score"',
    us: 'Placement sampling across owned seed inboxes',
  },
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

// NOT LIVE: gated on the seed-inbox placement sampling feature shipping.
// noIndex is set below and this page is already excluded from
// app/sitemap.ts and disallowed in app/robots.ts. Do not link this page
// from nav, footer, or any other page until the feature ships.
//
// REAL route-level gating (Part C), not just SEO suppression: two env vars, both required.
// ENABLE_VS_INSTANTLY=true is required just to render the page at all — unset/false is a real
// 404 via notFound(), not merely hidden from search. SEED_PLACEMENT_LIVE_IN_PRODUCTION=true is
// the operator's own explicit attestation that seed-inbox placement sampling is confirmed live in
// production — a deployment fact this codebase cannot verify on its own (no git-repo env var can
// prove a runtime fact), so it must be asserted by hand as a SECOND, independent flag. Setting
// only one of the two is treated as a misconfiguration, not "on": it's logged loudly server-side
// and rendered as an explicit misconfigured state rather than either the real page or a silent
// 404, so an operator who half-enabled this by mistake finds out immediately. See .env/.env.example
// for the full rationale on both vars.
function isFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function VsInstantlyMisconfigured() {
  return (
    <div className="wrap py-24 text-center">
      <div className="label text-fail mb-4">Misconfigured</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">
        /vs/instantly is misconfigured
      </h1>
      <p className="text-base text-ink-muted max-w-xl mx-auto">
        <code className="font-mono">ENABLE_VS_INSTANTLY</code> is true, but{' '}
        <code className="font-mono">SEED_PLACEMENT_LIVE_IN_PRODUCTION</code> is not also true.
        Both environment variables are required together before this page will render — see{' '}
        <code className="font-mono">.env/.env.example</code> for what each one gates and why. This
        page stays hidden until both are explicitly set to <code className="font-mono">true</code> in
        this deployment&rsquo;s environment.
      </p>
    </div>
  );
}

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Instantly — real placement sampling vs a self-reported warmup score',
  description:
    'WarmHawk vs Instantly compared: self-hosted infrastructure with a 30-day guarantee and founder-staffed support, versus Instantly’s warmup “heat score,” reported double billing, and slow support at ~$400/month.',
  path: '/vs/instantly',
  noIndex: true,
});

const faqItems = [
  {
    question: "Is WarmHawk's placement sampling the same as Instantly's warmup score?",
    answer:
      'No, and we want to be precise about that. Instantly’s warmup score is a self-reported heat rating from its own warmup network. WarmHawk’s placement sampling BCCs a handful of your own seed inboxes on real sends and reports which folder each one actually landed in — a narrower, more literal signal, not a full inbox-placement testing product.',
  },
  {
    question: 'Does WarmHawk fix the problem where a high warmup score doesn’t mean real inbox placement?',
    answer:
      'It addresses it honestly rather than repeating it. WarmHawk doesn’t publish a single confidence score at all — it reports actual per-seed-inbox placement results (inbox, spam, or promotions) from real sends, so there’s nothing to inflate.',
  },
  {
    question: 'How does WarmHawk’s support compare to Instantly’s at a similar price point?',
    answer:
      'Instantly users report support that’s either a bot or slow to respond even at roughly $400/month. WarmHawk’s support is founder-staffed: first response within 1 business day, 4 business hours for critical issues.',
  },
  {
    question: 'Can I get double-billed or denied a refund on WarmHawk like some Instantly users report?',
    answer:
      'Structurally, no — WarmHawk is self-hosted with no metered platform billing layer to double-charge in the first place, and every plan includes a 30-day money-back guarantee.',
  },
  {
    question: 'Why hasn’t this page been made public yet?',
    answer:
      'It’s marked noindex and isn’t linked from the site because the placement-sampling feature it describes hasn’t shipped yet. We don’t publish comparison pages ahead of the feature they depend on.',
  },
];

export default function VsInstantlyPage() {
  const vsInstantlyEnabled = isFlagEnabled(process.env.ENABLE_VS_INSTANTLY);
  const seedPlacementLive = isFlagEnabled(process.env.SEED_PLACEMENT_LIVE_IN_PRODUCTION);

  if (!vsInstantlyEnabled) {
    // Real 404 — not just hidden from search. This is the default, expected state today.
    notFound();
  }

  if (!seedPlacementLive) {
    // ENABLE_VS_INSTANTLY is true but the second, independent attestation isn't — fail loudly in
    // server logs rather than silently rendering a page that claims a production fact nothing in
    // this codebase actually verified.
    console.error(
      '[vs/instantly] MISCONFIGURED: ENABLE_VS_INSTANTLY=true but SEED_PLACEMENT_LIVE_IN_PRODUCTION ' +
        'is not also true. This page\'s whole argument is real, production-verified seed-inbox ' +
        'placement sampling — rendering it without that second confirmation would make WarmHawk ' +
        'guilty of exactly the overclaiming this page criticizes Instantly for. Refusing to render ' +
        'the real content; see .env/.env.example for both required env vars.',
    );
    return <VsInstantlyMisconfigured />;
  }

  return (
    <>
      <DoNotPublishComment />

      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-14 md:pb-16">
        <div className="label text-rust mb-5">WarmHawk vs Instantly</div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          The heat score says 91. Your inbox placement says otherwise.
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-9">
          Instantly&rsquo;s own users have reported a warmup &ldquo;heat score&rdquo; reading 90+
          while real inbox placement collapsed to 30&ndash;40%. WarmHawk replaces that vanity
          metric with an honest signal instead: it BCCs real sends to a handful of your own seed
          inboxes and reports exactly which folder each one landed in. We call that placement
          sampling, not full inbox-placement testing, and we mean the distinction &mdash; see
          below.
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
          Instantly&rsquo;s warmup dashboard can show a heat score of 90+ while real inbox placement
          collapses to 30-40%, because the score measures its own warmup network, not where your
          actual sends land. WarmHawk ships placement sampling instead: BCC a handful of your own
          seed inboxes on real sends and report which folder each one landed in.
        </AnswerBlock>
      </div>

      {/* HONEST SCOPING CALLOUT */}
      <div className="wrap pb-16 md:pb-20">
        <div className="card bg-cream-elevated p-8 max-w-3xl">
          <div className="label text-rust mb-3">Scope, stated plainly</div>
          <h2 className="font-display text-xl font-semibold mb-3">
            We call this placement sampling, not inbox-placement testing
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-muted mb-4">
            Here is exactly what it measures: a small, fixed set of email accounts that you own are
            BCC&rsquo;d on real campaign sends, and WarmHawk reports which folder each one landed in
            &mdash; inbox, spam, or promotions &mdash; per mailbox sending domain. That&rsquo;s a
            real, first-party signal pulled from an actual send, not a modeled score.
          </p>
          <p className="text-[15px] leading-relaxed text-ink-muted mb-4">
            Here is what it does not do: it does not test placement across every inbox provider or
            every recipient on your list, it is not a statistically exhaustive placement-testing
            panel, and a handful of seed inboxes is a sample, not a census. We are not going to
            market a number that oversells what it measures &mdash; that is precisely the mistake
            this whole page exists to point out.
          </p>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            <StatCite source='Reddit thread "Instantly.ai Just Admitted Their Warmup Network Got My Brand New Domains Reputation Blocked"'>
              The failure mode we&rsquo;re responding to is well documented: a warmup network score
              can read 90+ while an agency&rsquo;s brand-new domains get their reputation blocked in
              the inboxes that actually matter
            </StatCite>
            .
          </p>
        </div>
      </div>

      {/* PAIN POINTS */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            Where Instantly falls short
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            Checked against what Instantly&rsquo;s own users report on Reddit, G2, and Trustpilot.
          </p>

          <div className="mb-12">
            <CompareTable themLabel="Instantly" rows={compareRows} />
          </div>

          <AnswerBlock>
            Instantly customers paying roughly $400/month report support that&rsquo;s either a bot
            or slow to respond, according to user reports and G2 reviews. WarmHawk&rsquo;s support
            is founder-staffed at support@warmhawk.com: first response within 1 business day, and
            within 4 business hours for critical issues like broken production sending or failed
            license activation.
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
                inside 1 business day, or 4 business hours if the dashboard won&rsquo;t unlock,
                license activation is failing, production sending is down, or TLS/cert issuance is
                failing.
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Double billing, no refund</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                <StatCite source="Reddit/Trustpilot">
                  Reddit and Trustpilot threads describe Instantly users hit with double billing and
                  denied refunds on a metered SaaS platform
                </StatCite>
                . WarmHawk is self-hosted, so there&rsquo;s no metered platform billing layer that
                can double-charge in the first place, and every plan carries a straightforward
                30-day money-back guarantee if it isn&rsquo;t the right fit.
              </p>
            </div>
          </div>

          <AnswerBlock>
            Reddit and Trustpilot threads describe Instantly users hit with double billing and
            denied refunds on a metered SaaS platform. WarmHawk is self-hosted, so there&rsquo;s no
            metered platform billing layer that can double-charge in the first place, and every plan
            carries a straightforward 30-day money-back guarantee if it isn&rsquo;t the right fit.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap py-16 md:py-20">
        <ComparisonCallout />
      </div>

      <FaqSection items={faqItems} title="WarmHawk vs Instantly: questions worth answering up front" />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Trade a vanity score for a real one.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            See your actual inbox placement, not a number the vendor reports about itself.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1 &mdash; $199/mo
            </Link>
            <Link
              href="/docs/quickstart"
              className="btn btn-on-dark"
            >
              Get the free engine
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
