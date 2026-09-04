import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

/**
 * The other four /vs/* pages target sequencers (Instantly, Smartlead, Lemlist, Woodpecker) or a
 * custom n8n build — someone shopping specifically for cold-email INFRASTRUCTURE (inboxes,
 * domains, dedicated IPs) is comparing WarmHawk against a provider like Inframail instead, not a
 * sequencer. Inframail's Agency Pack ($228/mo billed annually, $327/mo month-to-month; 3 dedicated
 * US IPs, 20 free domains, unlimited inboxes, up to 300k emails/mo, a deliverability consultant —
 * verified against Inframail's own pricing/review coverage, 2026-09-03) doesn't meter seats either,
 * so "no per-seat math" doesn't land as WarmHawk's differentiator here the way it does against a
 * sequencer. What does: Inframail is still a vendor-hosted SaaS account on a shared control plane
 * even with a dedicated sending IP (the same "dedicated IP isn't dedicated infrastructure"
 * distinction ComparisonCallout already makes generically), and a hosted account is one the vendor
 * can suspend or rate-limit — a self-hosted deployment structurally cannot be.
 */
const compareRows: CompareRow[] = [
  {
    label: 'Pricing model',
    them: '$228–327/mo, flat — meters emails/mo, not seats',
    us: '$199/mo, flat — no metered send cap',
  },
  {
    label: 'Infrastructure',
    them: 'Vendor-hosted control panel, dedicated sending IP only',
    us: 'Your own containers, database, nginx, TLS — nothing shared',
  },
  {
    label: 'Account risk',
    them: 'Vendor-hosted — the vendor can suspend or rate-limit the account',
    us: 'Self-hosted — nothing to suspend; you hold the server',
  },
  {
    label: 'Domains included',
    them: '20 free domains on the Agency Pack, then priced separately',
    us: 'Unlimited client domains, one flat fee',
  },
  {
    label: 'Setup',
    them: 'Hosted, fast — but you own none of the infrastructure',
    us: 'One command, under 10 minutes, and it’s yours',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Inframail — Self-Hosted Infrastructure vs a Hosted Inbox Provider',
  description:
    'Compare WarmHawk and Inframail on infrastructure ownership, not just inbox counts. See why a dedicated sending IP on a shared control panel is a different thing from a self-hosted, unsuspendable server.',
  path: '/vs/inframail',
});

const faqItems = [
  {
    question:
      'Inframail already includes dedicated IPs — isn’t that the same as WarmHawk’s single tenancy?',
    answer:
      'No. A dedicated sending IP only isolates the IP address itself — the account, control panel, database, and proxy layer underneath it are still Inframail’s shared, multi-tenant infrastructure. WarmHawk gives you your own containers, database, nginx, and TLS certificate, not just a private-feeling IP on a shared platform.',
  },
  {
    question: 'Inframail doesn’t charge per seat either — so what does WarmHawk actually win on?',
    answer:
      'Ownership, not metering. Inframail’s Agency Pack still caps monthly email volume and is a hosted account the vendor operates and can suspend or rate-limit. WarmHawk is software you run on your own server — there’s no vendor-side account to suspend, and no send-volume cap beyond what your own mailboxes can safely handle.',
  },
  {
    question: 'Is Inframail cheaper than WarmHawk?',
    answer:
      'Close, depending on billing term — Inframail’s Agency Pack runs $228/mo billed annually or $327/mo month-to-month, against WarmHawk’s flat $199/mo (or $1,990/yr). The bigger difference isn’t the sticker price, it’s that WarmHawk’s fee doesn’t change based on volume or domain count, and there’s no account for a vendor to ever suspend.',
  },
  {
    question: 'Can I migrate from Inframail without losing my sending domains?',
    answer:
      'Yes. CSV import and webhook ingestion both cover migrating leads and campaigns, and Tier 2 (Enterprise DFY) includes white-glove list and domain migration as a one-time setup service if you’d rather have it done for you.',
  },
  {
    question: 'Does WarmHawk include a deliverability consultant like Inframail’s Agency Pack?',
    answer:
      'Not a human consultant — instead, every account gets real seed-inbox placement testing and continuous SPF/DKIM/DMARC/blocklist monitoring built into the dashboard, plus a founder-staffed support SLA (1 business day, 4h on critical issues) on Tier 1 and Tier 2.',
  },
];

export default function InframailComparisonPage() {
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
            <div className="label text-rust mb-5">WarmHawk vs Inframail</div>
            <h1 className="font-display text-4xl md:text-[50px] leading-tight font-semibold mb-6">
              A dedicated IP isn&rsquo;t dedicated infrastructure.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-9">
              Inframail&rsquo;s Agency Pack gives you a private sending IP on top of its own shared,
              vendor-operated control panel &mdash; a hosted account the vendor can suspend or
              rate-limit at any time. WarmHawk gives you your own containers, database, nginx, and
              TLS certificate on a server only you control &mdash; nothing to suspend, because
              there&rsquo;s no vendor-side account to suspend it from.
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
            <div className="label text-ink-muted mb-5">WarmHawk vs Inframail, at a glance</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">100%</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  single-tenant infrastructure
                </div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="font-display text-2xl font-bold text-rust">$199</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  flat per month, no volume cap
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">0</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  accounts a vendor can suspend
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED IP != DEDICATED INFRASTRUCTURE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            A private IP address is not private infrastructure
          </h2>
          <AnswerBlock>
            Inframail&rsquo;s Agency Pack includes three dedicated US IPs, which genuinely helps
            isolate your sending reputation from other customers&rsquo; IPs. What it doesn&rsquo;t
            change is everything underneath the IP: the account is still provisioned, hosted, and
            operated on Inframail&rsquo;s own shared control plane. WarmHawk goes a layer deeper —
            your own containers, your own Postgres database, your own nginx and TLS certificate, on
            a server you actually control.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              &ldquo;Dedicated IP&rdquo; is a real and useful feature &mdash; it just answers a
              narrower question than &ldquo;whose infrastructure is this running on.&rdquo; The
              application layer, the database, and the account itself are still Inframail&rsquo;s to
              provision, meter, and — per any hosted SaaS&rsquo;s standard terms of service —
              suspend or rate-limit if they decide to.
            </p>
            <p>
              WarmHawk doesn&rsquo;t offer a &ldquo;dedicated IP add-on&rdquo; because there&rsquo;s
              nothing to add it to — every account already gets its own complete stack, top to
              bottom. There is no shared control panel underneath a WarmHawk instance for a vendor
              decision to ever reach into.
            </p>
          </div>
        </div>
      </div>

      {/* FLAT FEE, NO VOLUME CAP */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          &ldquo;No per-seat math&rdquo; only gets you halfway here
        </h2>
        <AnswerBlock>
          Inframail&rsquo;s Agency Pack doesn&rsquo;t charge per seat either, so that specific
          argument doesn&rsquo;t separate WarmHawk from it the way it does against a per-seat
          sequencer. What still separates the two: Inframail&rsquo;s plan caps monthly email volume
          and free domain count, and the fee changes if you outgrow either. WarmHawk&rsquo;s flat
          $199/mo has no metered send cap and no domain limit — your own mailboxes and queue decide
          what&rsquo;s safe to send, not a plan tier.
        </AnswerBlock>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            <StatCite source="Inframail pricing pages and third-party review coverage, verified 2026-09-03">
              Inframail&rsquo;s Agency Pack runs $228/mo billed annually or $327/mo month-to-month,
              with 20 free domains and up to 300,000 emails per month included
            </StatCite>
            . That&rsquo;s a genuinely competitive price for what it includes — but it is still a
            metered plan with a ceiling, on infrastructure you don&rsquo;t own.
          </p>
          <p>
            WarmHawk&rsquo;s $199/mo (or $1,990/yr) is the same number whether you connect 3 domains
            or 30, and whether you send 30,000 emails a month or 300,000 — the only ceiling is what
            your own connected mailboxes can safely handle, enforced by the same cadence-and-jitter
            queue logic on every account.
          </p>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="wrap py-16 md:py-20">
        <div className="text-center mb-11 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-2.5">
            Infrastructure and pricing, side by side
          </h2>
        </div>
        <CompareTable themLabel="Inframail" rows={compareRows} />
      </div>

      <div className="wrap">
        <ComparisonCallout />
      </div>

      <FaqSection items={faqItems} />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Own the infrastructure, not just the IP.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Flat $199/mo, no volume cap, nothing for a vendor to suspend.
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
