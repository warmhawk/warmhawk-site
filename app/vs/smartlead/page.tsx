import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

const compareRows: CompareRow[] = [
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
  {
    label: 'Observability',
    them: 'No native OTEL export',
    us: 'Free, default-on OTEL export — wire it into your own stack',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Smartlead — self-hosted infrastructure vs stacked SaaS add-ons',
  description:
    'WarmHawk vs Smartlead compared: flat $199/month self-hosted infrastructure with free monitoring and founder-staffed support, versus Smartlead’s multi-tenant platform, silent mid-send failures, and add-ons that stack the bill 3-5x.',
  path: '/vs/smartlead',
});

const faqItems = [
  {
    question: 'Is WarmHawk cheaper than Smartlead?',
    answer:
      'On sticker price they can look close, but Smartlead’s premium warmup, whitelabel, and other add-ons are sold separately and commonly push the real bill to 3-5x the advertised rate. WarmHawk’s $199/month is flat — unlimited mailboxes, domains, and users, with Uptime Kuma monitoring and OTEL export included, not upsold.',
  },
  {
    question: 'Does WarmHawk have the same add-ons Smartlead charges extra for?',
    answer:
      'The comparable features — uptime/health monitoring and observability export — are bundled and on by default in WarmHawk’s Self-Hosted Pro tier. There is no premium-warmup or whitelabel upsell tier because there’s nothing left to unbundle: it’s one flat price for the whole product.',
  },
  {
    question: 'What happens if a campaign fails mid-send?',
    answer:
      'On Smartlead, users have reported campaigns stopping with no notification — you find out when you happen to check the dashboard. WarmHawk runs Uptime Kuma health checks every minute against the dashboard, API, Postgres, Redis, the BullMQ worker, n8n, and the mail relay, and pushes failures to your own Slack, Discord, or email webhook.',
  },
  {
    question: "How fast is WarmHawk support compared to Smartlead's?",
    answer:
      'Slow support responsiveness is the most common G2 complaint against Smartlead. WarmHawk’s support is founder-staffed: first response within 1 business day, and within 4 business hours for critical issues like a broken production send, failed license activation, or a TLS/cert issuance failure.',
  },
  {
    question: 'Does WarmHawk sync natively with HubSpot, Salesforce, or Pipedrive like Smartlead?',
    answer:
      'Not yet, and we’d rather say that plainly than gloss over it. Smartlead ships native pushes to those CRMs today. WarmHawk currently supports CSV import and inbound webhook lead ingestion; native outbound CRM connectors are on the backlog, gated on customer demand, not shipped as of this writing.',
  },
];

export default function VsSmartleadPage() {
  return (
    <>
      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-14 md:pb-16">
        <div className="label text-rust mb-5">WarmHawk vs Smartlead</div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          When a campaign stops mid-send, you&rsquo;ll know before your prospects do.
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-9">
          Smartlead campaigns have been reported to stop mid-send with no notification, and hidden
          add-ons &mdash; premium warmup, whitelabel &mdash; can stack a bill to 3&ndash;5x the base
          price. WarmHawk runs on a server that belongs only to you, bundling Uptime Kuma health
          checks and native OpenTelemetry export from the first install, for one flat $199/month
          with nothing sold separately.
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
          WarmHawk is self-hosted, single-tenant cold-email infrastructure at a flat $199/month;
          Smartlead is a shared, multi-tenant SaaS platform where premium warmup, whitelabel, and
          other add-ons stack the effective price to 3-5x the advertised base rate. WarmHawk&rsquo;s
          Uptime Kuma monitoring and OTEL export ship free by default &mdash; Smartlead sells
          comparable visibility as an upsell.
        </AnswerBlock>
      </div>

      {/* PAIN POINTS */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            Where Smartlead falls short
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            None of this is a hit piece &mdash; it&rsquo;s what Smartlead&rsquo;s own users report,
            checked against how the two products are actually architected.
          </p>

          <div className="mb-12">
            <CompareTable themLabel="Smartlead" rows={compareRows} />
          </div>

          <AnswerBlock>
            When a Smartlead campaign stalls mid-send, users report getting no notification at all
            &mdash; the failure surfaces only when someone happens to check the dashboard. WarmHawk
            bundles Uptime Kuma, running 1-minute health checks across every service in the stack,
            and pushes alerts straight to your own Slack, Discord, or email webhook &mdash;
            configured once during install.
          </AnswerBlock>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Campaigns fail silently</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                <StatCite source="G2/Reddit">
                  Smartlead campaigns have been reported to stop mid-send with no notification
                </StatCite>{' '}
                reaching the user. WarmHawk installs Uptime Kuma by default on every Tier 1 and Tier
                2 install, watching the dashboard, API, Postgres, Redis, the BullMQ send worker,
                n8n, and the mail relay every 60 seconds, and firing to the Slack, Discord, or email
                webhook you set during <code>install.sh</code>. A stalled queue surfaces as an
                alert, not as a quiet gap in your send logs.
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Support is the top complaint</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                <StatCite source="G2">
                  Support responsiveness is consistently the most-cited complaint against Smartlead
                  on G2
                </StatCite>
                . WarmHawk is founder-staffed at{' '}
                <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
                  support@warmhawk.com
                </a>{' '}
                &mdash; first response inside 1 business day, and inside 4 business hours if the
                dashboard won&rsquo;t unlock, license activation is failing, production sending is
                down, TLS/cert issuance is failing, or the install script itself won&rsquo;t
                complete.
              </p>
            </div>
            <div className="card bg-cream p-7">
              <div className="font-semibold text-base mb-2.5">Add-ons stack the bill</div>
              <p className="text-sm leading-relaxed text-ink-muted">
                <StatCite source="Cost breakdowns">
                  Independent cost breakdowns show Smartlead&rsquo;s premium warmup, whitelabel, and
                  other add-ons stacking the effective price to 3-5x the advertised base rate
                </StatCite>
                . WarmHawk&rsquo;s $199/month is the whole product: unlimited mailboxes and domains,
                Uptime Kuma, and native OTEL export are bundled by default, never sold as separate
                upgrades.
              </p>
            </div>
          </div>

          <AnswerBlock>
            Smartlead&rsquo;s advertised price rarely resembles the bill agencies actually pay once
            premium warmup, whitelabel, and other add-ons are stacked on &mdash; cost breakdowns
            show the real total running 3 to 5 times the base rate. WarmHawk&rsquo;s $199/month is
            flat: Uptime Kuma monitoring and native OTEL export are included, not sold separately,
            at every tier.
          </AnswerBlock>
        </div>
      </div>

      {/* HONEST GAP */}
      <div className="wrap py-16 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">
            Where Smartlead is still ahead: native CRM sync
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-muted mb-4">
            We&rsquo;d rather list this honestly than let a comparison page oversell. Smartlead
            ships native push integrations to HubSpot, Salesforce, and Pipedrive today. WarmHawk
            doesn&rsquo;t &mdash; as of this writing, the product supports CSV import and inbound
            webhook lead ingestion, but there is no native outbound CRM connector yet.{' '}
            <StatCite source="2026 competitor-integration research">
              Native CRM push is one of the few integration categories where Smartlead is ahead of
              WarmHawk today
            </StatCite>
            .
          </p>
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Native HubSpot, Salesforce, and Pipedrive connectors are on WarmHawk&rsquo;s backlog,
            gated on customer demand rather than shipped speculatively. If your workflow depends on
            a native CRM push today, Smartlead currently covers that better &mdash; everything else
            on this page is where WarmHawk pulls ahead.
          </p>
        </div>

        <ComparisonCallout />
      </div>

      <FaqSection
        items={faqItems}
        title="WarmHawk vs Smartlead: questions worth answering up front"
      />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Nothing sold separately.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Uptime monitoring and OTEL export are bundled by default, not upsells.
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
