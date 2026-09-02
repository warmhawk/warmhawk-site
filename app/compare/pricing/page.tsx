import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { pricingFaqItems } from '@/lib/faqContent';
import { PricingTable } from '@/components/PricingTable';
import { CheckoutButtons } from '@/components/CheckoutButtons';
import { FaqSection } from '@/components/FaqSchema';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk Pricing — Cold Email Software Pricing Comparison',
  description:
    'WarmHawk pricing broken down: Tier 0 free and open-source, Tier 1 Self-Hosted Pro at $199/mo flat, Tier 2 Enterprise DFY at $999 + $300/mo. Full feature matrix, billing mechanics, and honest cost-at-scale comparison against per-seat cold email tools.',
  path: '/compare/pricing',
});

// Hero headline/subhead, the feature-matrix framing, and the closing CTA are matched against the
// source design artifact (warmhawk-full-prototype.html
// `#page-compare-pricing`, lines 646-683) — its eyebrow, exact h1 ("No credits. No per-seat math.
// One flat fee."), the "unlimited users" precision callout, and closing line ("Pick the tier that
// matches how much you want to run yourself.") are carried over close to verbatim. The pricing
// cards themselves stay on the shared <PricingTable /> (lib/tierConfig.ts) rather than forking a
// second copy here. Everything below the matrix (billing mechanics, cost-at-scale framing, FAQ) is
// this site's own AEO-oriented content beyond what the single-page artifact needed — kept as-is,
// since it's real, accurate supporting detail, not a mockup section to prune down to match.

const matrixRows: { feature: string; tier0: string; tier1: string; tier2: string }[] = [
  {
    feature: 'API + sending/queueing engine, direct API access',
    tier0: 'Yes',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Operator Dashboard (web UI)',
    tier0: 'No',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Unlimited client domains, mailboxes & users (one flat fee per account)',
    tier0: 'N/A — API-only, no seats',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Live queue inspector, throttling controls, analytics, domain health alerts',
    tier0: 'No',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'CSV lead import',
    tier0: 'Yes, via API',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Gemini/Claude BYOK AI personalization (EU AI-disclosure marker included)',
    tier0: 'Yes, via API',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Own nginx/TLS package, one-command install.sh',
    tier0: 'Yes',
    tier1: 'Yes',
    tier2: 'Yes — WarmHawk runs it for you',
  },
  {
    feature: 'One-command in-place upgrades (warmhawk update)',
    tier0: 'Yes',
    tier1: 'Yes',
    tier2: 'Yes — WarmHawk runs it for you',
  },
  {
    feature: 'Guided first-login onboarding checklist',
    tier0: 'N/A — no dashboard',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Native OTEL export (free, BYO backend)',
    tier0: 'No',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    // Corrected 2026-08-30: Uptime Kuma is bundled in warmhawk-core-engine's own
    // docker-compose.yml and provisioned by its install.sh, so a Tier 0 install genuinely gets it
    // — this row previously said "N/A — no dashboard to monitor", understating the free tier
    // against what actually ships. The tier difference is the operator dashboard's own health
    // alerting on top, not Kuma itself.
    feature: 'Bundled Uptime Kuma (free, 1-min checks on every service, on by default)',
    tier0: 'Yes — bundled with the engine',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Nightly backups, bundled + documented',
    tier0: 'N/A — customer owns their own Postgres separately',
    tier1: 'Yes, default-on',
    tier2: 'Yes, default-on',
  },
  {
    feature: '2FA/MFA on dashboard login',
    tier0: 'N/A — no dashboard',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Team invite/remove (flat permissions)',
    tier0: 'N/A',
    tier1: 'Yes',
    tier2: 'Yes',
  },
  {
    feature: 'Audit log (who-did-what-when)',
    tier0: 'No',
    tier1: 'No',
    tier2: 'Planned — Tier 2 only, procurement-driven',
  },
  {
    feature: 'Support channel',
    tier0: 'Community (GitHub, best-effort)',
    tier1: 'support@warmhawk.com — 1 business day / 4h critical',
    tier2: 'Direct founder line, same-business-day',
  },
  {
    feature: 'Managed deployment, DNS, dedicated IPs, white-glove migration, BYO-cert support',
    tier0: 'No',
    tier1: 'No',
    tier2: 'Yes',
  },
  {
    feature: '30-day money-back guarantee',
    tier0: 'N/A',
    tier1: 'Yes',
    tier2: 'N/A — custom-scoped engagement',
  },
];

export default function PricingComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />
      {/* HERO / INTRO */}
      <div className="wrap pt-16 md:pt-24 pb-14">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">Cold email software pricing comparison</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            No credits. No per-seat math. One flat fee.
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted mb-6">
            Send/data credits that don&rsquo;t roll over and per-seat pricing that scales brutally
            are two of the most common complaints across this category. WarmHawk is structurally
            exempt from both — there&rsquo;s no metered credit system in a self-hosted product, and
            one flat fee covers unlimited users.
          </p>
          <p className="text-base leading-relaxed text-ink-muted mb-6">
            WarmHawk has three tiers, and the split is deliberate: Tier 0 is a free,
            fully-functional sending engine you run yourself. Tier 1 (Self-Hosted Pro) is $199/mo
            flat for the operator dashboard and a founder-staffed support SLA on top of that same
            engine. Tier 2 (Enterprise DFY) is $999 one-time plus $300/mo for WarmHawk to deploy and
            operate it for you. Billing for Tier 1 runs entirely through Stripe — Checkout to start,
            the Stripe Customer Portal to manage cards, invoices, upgrades, and cancellations
            afterward.
          </p>
          <AnswerBlock>
            WarmHawk has three tiers: Tier 0 is free and open, giving you the full sending engine
            via API with no dashboard or SLA. Tier 1 is $199/mo flat for the operator dashboard,
            live monitoring, and a founder support SLA — unlimited users and domains, no per-seat
            pricing. Tier 2 is $999 + $300/mo for WarmHawk to deploy, migrate, and operate the same
            software for you.
          </AnswerBlock>
          <p className="text-base leading-relaxed text-ink-muted">
            Every tier runs the identical sending, queueing, and AI-personalization engine —{' '}
            <StatCite source="G2/Reddit, 2026 competitor architecture research">
              unlike Instantly, Smartlead, or Lemlist, where higher plans often mean different
              sending limits or feature gates on the core product
            </StatCite>
            . What changes between WarmHawk&rsquo;s tiers is who operates the dashboard layer and
            who carries the support and deployment burden — not what the engine itself can do.
          </p>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div id="pricing" className="wrap pb-16 md:pb-20">
        <PricingTable />
      </div>

      {/* CHECKOUT */}
      <div className="wrap pb-20 md:pb-24">
        <div className="max-w-md mx-auto">
          <CheckoutButtons />
        </div>
      </div>

      {/* FULL FEATURE MATRIX */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            The full Tier 0 / Tier 1 / Tier 2 feature matrix
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            Every row below reflects what actually ships today. Where something is planned but not
            built, it says so — nothing here is aspirational marketing copy.
          </p>

          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr>
                  <th className="label text-left p-5 text-ink-muted font-semibold">Feature</th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    Tier 0 — Free
                  </th>
                  <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                    Tier 1 — $199/mo
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    Tier 2 — $999 + $300/mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="p-5 border-t border-border align-top">{row.feature}</td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.tier0}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top">{row.tier1}</td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.tier2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card bg-cream mt-6 p-6 max-w-3xl mx-auto border-l-2 border-rust">
            <p className="text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">
                A precision note on &ldquo;unlimited users.&rdquo;
              </strong>{' '}
              Unlimited users on Tier 1 and Tier 2 grants your whole team shared access to{' '}
              <em>one account&rsquo;s</em> data, under flat permissions — everyone who&rsquo;s
              invited sees everything in that account. It is not the same thing as per-end-client
              data isolation between an agency&rsquo;s own separate clients. That kind of
              walled-off, client-by-client isolation inside a single account is a
              tracked-but-unbuilt future item today, not a shipped feature — if you need it now, run
              separate accounts per client instead of relying on the permission system to separate
              them for you.
            </p>
          </div>
        </div>
      </div>

      {/* WHY EACH TIER COSTS WHAT IT COSTS */}
      <div className="wrap py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-3">
            Why each tier costs what it costs
          </h2>
          <AnswerBlock>
            Tier 0 is free because WarmHawk operates nothing on your behalf at that tier — no
            dashboard, no SLA, no managed infrastructure, just code you run. Tier 1&rsquo;s $199/mo
            buys the dashboard layer, a founder-staffed support SLA, and zero-per-seat pricing at
            any team size. Tier 2&rsquo;s $999 + $300/mo buys WarmHawk&rsquo;s hours: doing the
            deployment and then operating it, ongoing.
          </AnswerBlock>

          <h3 className="font-display text-xl font-semibold mt-10 mb-3">Tier 0 — $0</h3>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            You pay nothing at Tier 0 because you are running nothing that WarmHawk operates,
            monitors, or supports beyond handing you the code. There is no dashboard to maintain on
            our side, no SLA clock ticking, no managed anything. That is the whole reason it costs
            $0 — not a crippled trial with a countdown, but a real, fully-functional sending and
            queueing engine, direct API access, CSV import, and BYOK AI personalization, with zero
            commercial obligation attached. If you can run the API yourself, Tier 0 never expires
            and never asks for a card.
          </p>

          <h3 className="font-display text-xl font-semibold mt-10 mb-3">Tier 1 — $199/mo</h3>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            $199/mo is not really priced for &ldquo;software&rdquo; — it buys three specific things
            on top of the free engine. First, the licensed operator dashboard itself: the queue
            inspector, throttling controls, analytics, and domain health alerts that turn the API
            into something you can actually run day to day without reading logs. Second, a
            founder-staffed support SLA — 1 business day standard, 4 hours on anything critical.{' '}
            <StatCite source="G2/Reddit">
              That SLA is precisely the thing competitors lose reviews over — support tickets that
              sit for days during a deliverability emergency
            </StatCite>
            . Third, pricing that does not grow with your team:{' '}
            <StatCite source="Cost analysis">
              unlimited users and unlimited client domains for one flat fee, at a point where a
              seat-metered or domain-metered competitor would already be charging more as you add
              people
            </StatCite>
            . What Tier 1 does <em>not</em> buy is a managed deployment or WarmHawk-hosted
            observability — you still run your own server, your own Uptime Kuma, your own OTEL
            backend. It is self-hosted software with a support contract, not a hosted service.
          </p>

          <h3 className="font-display text-xl font-semibold mt-10 mb-3">Tier 2 — $999 + $300/mo</h3>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            The $999 one-time fee is founder-hours: DNS configuration, dedicated IP setup,
            white-glove migration off whatever you were running before, and doing the deployment
            itself instead of walking you through install.sh. The $300/mo retainer after that buys
            ongoing operational ownership of the deployment — someone on WarmHawk&rsquo;s side
            keeping it patched, updated, and healthy so it is never your 2am problem. What Tier 2
            does <em>not</em> buy is a different product: the observability stack (bundled Uptime
            Kuma plus native OTEL export) is identical on Tier 1 and Tier 2. Tier 2 is priced for
            WarmHawk&rsquo;s time, not for extra features the dashboard is missing.
          </p>
        </div>
      </div>

      {/* BILLING MECHANICS */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-3">
              How billing actually works
            </h2>
            <AnswerBlock>
              Tier 1 billing runs on Stripe end to end: Stripe Checkout to start, and the Stripe
              Customer Portal afterward to update a card, download invoices, toggle monthly ⇄
              annual, or cancel — no support ticket required for any of it. A 30-day money-back
              guarantee and a discounted annual price ($1,990/yr) are both baked into the same
              setup.
            </AnswerBlock>
            <p className="text-base leading-relaxed text-ink-muted mb-4">
              Starting a Tier 1 subscription goes through the monthly/annual checkout widget above —
              pick an interval and it redirects to a hosted Stripe Checkout payment page. Everything
              afterward is self-serve through the Stripe Customer Portal: update the card on file,
              view and download every invoice, upgrade or downgrade between monthly and annual
              billing, or cancel outright, all without emailing anyone.
            </p>
            <p className="text-base leading-relaxed text-ink-muted mb-4">
              Annual billing is a second Stripe Price on the same product, not a separate plan —
              $1,990/yr instead of $199 × 12 ($2,388), roughly two months free for prepaying,
              offered as a toggle both at checkout and later inside the Customer Portal if you want
              to switch direction after the fact. And Tier 1 carries a plain 30-day money-back
              guarantee: cancel inside the first 30 days of your first charge and it is refunded in
              full, no retention call, no justification required.
            </p>
          </div>
        </div>
      </div>

      {/* COST COMPARISON FRAMING */}
      <div className="wrap py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-3">
            What per-seat and credit-based pricing actually costs you
          </h2>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            Most cold email tools price by seat, by domain, or by a monthly credit allowance — and
            all three scale against you as your team or your client list grows.{' '}
            <StatCite source="Cost analysis">
              Per-seat pricing in particular scales brutally for agencies: every hire, every new
              client-facing teammate, is another line item, on top of whatever the base plan already
              costs
            </StatCite>
            . WarmHawk&rsquo;s Tier 1 is flat: unlimited users and unlimited client domains for one
            $199/mo fee, structurally, because there is no per-seat metering built into the product
            at all — not a discount, a different architecture.
          </p>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            The same is true of send credits.{' '}
            <StatCite source="Cost analysis">
              Across the industry, unused send or data credits typically do not roll over month to
              month — you lose whatever allowance you didn&rsquo;t use
            </StatCite>
            . WarmHawk has no credit system to lose anything from in the first place: a self-hosted
            engine sends what your own mailboxes and queue can safely handle, not what a monthly
            allowance permits.
          </p>
          <p className="text-base leading-relaxed text-ink-muted">
            Put concretely: picture a 10-person agency team running client outreach. On a per-seat
            competitor, the bill is whatever the base plan costs, multiplied out or stacked with
            add-ons as each of those 10 people needs a login — the exact numbers vary by vendor and
            plan tier, but the direction is consistent, and it moves with headcount. On WarmHawk,
            that same 10-person team is still $199/mo, flat, on Tier 1 — the eleventh hire changes
            nothing on the invoice. That gap is structural, not promotional: it is the difference
            between software priced per seat and software priced per account.
          </p>
        </div>
      </div>

      <FaqSection items={pricingFaqItems} title="Pricing questions worth answering up front" />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Pick the tier that matches how much you want to run yourself.
          </h2>
          <p className="text-lg text-slate-soft mb-9 max-w-xl mx-auto">
            Run the engine yourself for $0, or get the dashboard, monitoring, and a founder-backed
            SLA for $199/mo — 30-day money-back guarantee included.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1
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
