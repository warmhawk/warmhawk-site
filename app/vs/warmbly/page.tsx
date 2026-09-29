import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

// Every Warmbly fact below is sourced from warmbly.com and github.com/warmbly/warmbly, checked
// September 2026 (see the WebFetch/GitHub API research this page was built from) — star count and
// pricing tiers move over time, so both are dated inline rather than stated as permanent facts.
// Deliberately does NOT include a "Deliverability signal" / seed-inbox-placement row: that specific
// comparative claim is gated behind SEED_PLACEMENT_LIVE_IN_PRODUCTION on app/vs/instantly/page.tsx
// because it asserts a production fact about WarmHawk that isn't confirmed live yet (see that
// page's own header comment, and app/vs/instantly-alternatives/page.tsx and
// app/vs/instantly-vs-smartlead-vs-lemlist/page.tsx, which apply the same exclusion). This page is
// unconditionally indexed, so it stays with only independently-sourced claims. Also deliberately
// does NOT render <ComparisonCallout /> — that component's "no competitor in this category
// publishes a self-hosted or per-customer-container option" claim is true against Instantly,
// Smartlead, Lemlist, and Woodpecker, but not against Warmbly, which is genuinely self-hostable
// under Apache-2.0. Repeating it here would be the exact overclaim this page's honesty bar rules
// out.
const compareRows: CompareRow[] = [
  {
    label: 'License',
    them: 'Apache 2.0 — OSI-approved open source',
    us: 'Business Source License 1.1 — source-available, converts to Apache 2.0 after 4 years',
  },
  {
    label: 'Hosting model',
    them: 'Self-host free, or their multi-tenant cloud from $23/mo',
    us: 'Self-hosted only — your own single-tenant containers, database, nginx, TLS',
  },
  {
    label: 'Warmup approach',
    them: 'Own-mailbox pool — gradual ramp within your connected mailboxes',
    us: 'Automated per-mailbox warmup on your own dedicated infrastructure',
  },
  {
    label: 'AI personalization',
    them: 'Built-in AI compose + reply-routing, vendor-run model',
    us: 'BYOK — your own Gemini or Claude key, no markup',
  },
  {
    label: 'Guardrails',
    them: 'Bounce/complaint handling, AI reply classification',
    us: 'CAN-SPAM auto-injection, RFC 8058 unsubscribe, GDPR erasure, bounce/complaint circuit breaker',
  },
  {
    label: 'Pricing',
    them: 'Free self-host, or hosted $23–263+/mo scaling with daily send volume',
    us: '$0 API-only, or $199/mo flat — unlimited mailboxes and users',
  },
  {
    label: 'Support',
    them: 'Community (GitHub, Discord); dedicated support on Enterprise',
    us: 'Founder-staffed — 1 business day, 4h on critical issues',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Warmbly — BSL Single-Tenant vs Apache-2.0 Open Source',
  description:
    'WarmHawk vs Warmbly compared: license (BSL 1.1 vs OSI Apache-2.0), warmup approach, AI personalization, guardrails, and pricing — an honest look, including where Warmbly is genuinely ahead.',
  path: '/vs/warmbly',
});

const faqItems = [
  {
    question: 'Is Warmbly actually open source?',
    answer:
      'Yes — genuinely so. Warmbly (github.com/warmbly/warmbly) is licensed Apache 2.0, an OSI-approved open source license, with roughly 340 GitHub stars as of September 2026. You can self-host it for free with no license restriction on running a competing service.',
  },
  {
    question: 'Is WarmHawk open source?',
    answer:
      'No, and we’d rather say that plainly than blur it. WarmHawk’s core engine is licensed under the Business Source License 1.1 (BSL) — source-available, not OSI open source. BSL grants a non-compete license to run and modify the code, and converts to Apache 2.0 automatically four years after each release. Warmbly’s Apache-2.0 license is the more open of the two today.',
  },
  {
    question: 'Does Warmbly have a free plan, and what does it actually include?',
    answer:
      'Warmbly’s hosted free plan covers up to 10 mailboxes and warmup, with no card and no time limit — but sending, the unified inbox, and the CRM are locked until you upgrade to a paid hosted tier starting at $23/month. Self-hosting Warmbly yourself is free under Apache 2.0 with the full feature set, including sending, with the same 10-mailbox limit on the free warmup pool (unlimited mailboxes for warmup runs $15/month self-hosted).',
  },
  {
    question: 'Which one costs less at scale?',
    answer:
      'It depends on what scales for you. Warmbly’s hosted pricing scales with daily send volume — $23/mo for 150 emails/day up to $263/mo for 15,000/day, as of September 2026 — so a high-volume sender pays more over time. WarmHawk is flat at $199/month regardless of mailbox count, user count, or send volume once you’re past the free Tier 0 API. Self-hosting Warmbly yourself sidesteps that scaling entirely, since it’s free under Apache 2.0 either way.',
  },
  {
    question: 'Does Warmbly do the same single-tenant infrastructure WarmHawk does?',
    answer:
      'If you self-host it, yes — you get your own Warmbly instance on your own server, same as WarmHawk. Where they differ is Warmbly also offers a hosted cloud option ("run it on our cloud or your own infra," per warmbly.com), which is presumably multi-tenant like most hosted SaaS. WarmHawk has no hosted option at all — every tier, including the free one, is self-hosted on your own server by design.',
  },
];

export default function WarmblyComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />

      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <div className="label text-rust mb-5">WarmHawk vs Warmbly</div>
            <h1 className="font-display text-4xl md:text-[50px] leading-tight font-semibold mb-6">
              Two self-hostable engines, two very different deals underneath.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-9">
              Warmbly is a genuinely open-source (Apache 2.0) cold-outreach and warmup platform you
              can self-host free or run on its hosted cloud. WarmHawk is source-available (Business
              Source License 1.1, not OSI open source) but gives every account its own single-tenant
              server and one flat fee with no per-volume pricing tiers. Neither is strictly
              &ldquo;better&rdquo; &mdash; they optimize for different things.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/checkout?tier=1" className="btn btn-primary">
                Start Tier 1 &mdash; $199/mo
              </Link>
              <Link href="/compare/pricing" className="btn btn-ghost">
                See full pricing
              </Link>
            </div>
          </div>

          <div className="card p-7">
            <div className="label text-ink-muted mb-5">At a glance, September 2026</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">Apache-2.0</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  Warmbly&rsquo;s license
                </div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="font-display text-2xl font-bold text-rust">BSL 1.1</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  WarmHawk&rsquo;s license
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">$199/mo flat</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  vs Warmbly&rsquo;s $23&ndash;263+/mo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LICENSE, UP FRONT */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            The license difference, stated plainly
          </h2>
          <AnswerBlock>
            Warmbly (
            <a
              href="https://github.com/warmbly/warmbly"
              className="text-rust font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/warmbly/warmbly
            </a>
            ) is licensed Apache 2.0 &mdash; a real, OSI-approved open source license, with{' '}
            <StatCite source="GitHub API, September 2026">roughly 340 GitHub stars</StatCite>.
            WarmHawk&rsquo;s core engine is licensed under the Business Source License 1.1: source
            you can read, self-host, and modify under a non-compete grant, converting automatically
            to Apache 2.0 four years after each release. That is not OSI open source, and
            we&rsquo;re not going to call it that.
          </AnswerBlock>
          <p className="max-w-3xl mx-auto text-[15px] leading-relaxed text-ink-muted">
            If a fully open, resell-anywhere license is what you actually need &mdash; you want to
            fork it, redistribute it, or build a competing hosted product on top of it &mdash;
            Warmbly&rsquo;s Apache 2.0 grant lets you do that today and WarmHawk&rsquo;s BSL does
            not. What WarmHawk trades for that restriction is a product built specifically to run as
            one single-tenant install per customer, with a support and pricing model built around
            that same idea.
          </p>
        </div>
      </div>

      {/* WARMUP APPROACH */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          Warmup: your own mailbox pool vs your own dedicated infrastructure
        </h2>
        <AnswerBlock>
          Warmbly warms mailboxes by gradually ramping send volume within the pool of mailboxes you
          connect &mdash; &ldquo;reputation-safe pools and gradual ramps that earn placement, not
          just inflate it,&rdquo; per warmbly.com. WarmHawk runs automated per-mailbox warmup on
          your own dedicated, per-customer infrastructure, with no pool shared across WarmHawk
          customers at all.
        </AnswerBlock>
        <p className="max-w-3xl mx-auto text-[15px] leading-relaxed text-ink-muted">
          Both approaches avoid the failure mode of a shared, vendor-wide warmup network, where one
          customer&rsquo;s bad sending behavior can degrade IP or domain reputation for everyone
          sharing that pool. Warmbly&rsquo;s free hosted plan includes warmup for up to 10 mailboxes
          with no card required; self-hosting Warmbly yourself keeps that same 10-mailbox free tier
          unless you pay $15/month for unlimited warmup mailboxes. WarmHawk includes warmup at no
          extra cost on every self-hosted account, with no separate warmup-only pricing tier.
        </p>
      </div>

      {/* AI + GUARDRAILS */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            AI compose and reply handling
          </h2>
          <AnswerBlock>
            Warmbly ships built-in AI compose (&ldquo;ask at the caret and the draft lands where you
            type&rdquo;) and AI-driven reply routing that classifies replies as interested, not
            ready, wrong person, out-of-office, unsubscribe, or bounce, feeding a unified inbox and
            a built-in CRM. WarmHawk instead has you bring your own Gemini or Claude API key for
            personalization &mdash; you pay your AI provider directly, at cost, with nothing routed
            through a shared gateway.
          </AnswerBlock>
          <p className="max-w-3xl mx-auto text-[15px] leading-relaxed text-ink-muted">
            Warmbly&rsquo;s AI reply triage and built-in CRM (contacts, pipelines, deals, tasks,
            meetings) go further than anything shipped in WarmHawk&rsquo;s dashboard today &mdash;
            WarmHawk&rsquo;s Tier 1/2 dashboard has a Unified Reply Inbox, but no pipeline/deal CRM
            layer on top of it. If a built-in CRM and AI-classified reply routing matter more to you
            than infrastructure ownership, that&rsquo;s a genuine point in Warmbly&rsquo;s favor.
            Where WarmHawk pushes back is on guardrails enforced structurally rather than left to
            configuration: CAN-SPAM auto-injection, RFC 8058 one-click unsubscribe on every send,
            CSV-injection defense, GDPR erasure, an EU AI Act disclosure marker, and a
            bounce/complaint circuit breaker that auto-pauses a campaign before a bad list damages a
            domain&rsquo;s reputation.
          </p>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="wrap py-16 md:py-20">
        <div className="text-center mb-11 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-2.5">
            WarmHawk vs Warmbly, side by side
          </h2>
          <p className="text-base text-ink-muted mt-3">
            Sourced from warmbly.com and github.com/warmbly/warmbly, checked September 2026.
          </p>
        </div>
        <CompareTable themLabel="Warmbly" rows={compareRows} />
      </div>

      {/* WHEN TO PICK EACH */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-10">
            When to pick which
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-3">When to pick Warmbly</div>
              <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-ink-muted">
                <li>
                  You need a genuinely OSI open-source license — Apache 2.0, no conversion wait.
                </li>
                <li>
                  You want to try it hosted, free, before deciding whether to self-host anything.
                </li>
                <li>
                  A built-in CRM and AI reply-routing across pipelines and deals matter to you.
                </li>
                <li>
                  You&rsquo;d rather pay less at low volume ($23/mo at 150 emails/day) than pay a
                  flat fee upfront.
                </li>
              </ul>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-3">When to pick WarmHawk</div>
              <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-ink-muted">
                <li>
                  You want true single-tenant infrastructure on every tier — your own containers,
                  database, nginx, TLS — not a vendor-run cloud option alongside self-hosting.
                </li>
                <li>
                  You want one flat $199/mo regardless of mailbox count, user count, or daily send
                  volume, instead of pricing that scales with volume.
                </li>
                <li>
                  You&rsquo;d rather bring your own Gemini or Claude key and pay your provider
                  directly than use a vendor-run AI model.
                </li>
                <li>
                  A four-year-to-Apache-2.0 source-available license is an acceptable trade for that
                  infrastructure model and pricing.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <FaqSection
        items={faqItems}
        title="WarmHawk vs Warmbly: questions worth answering up front"
      />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Own the infrastructure, not just the code.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Flat $199/mo, single-tenant by default, no hosted-vs-self-hosted decision to make.
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
