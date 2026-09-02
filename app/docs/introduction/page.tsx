import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { tiers } from '@/lib/tierConfig';

export const metadata: Metadata = pageSeo({
  title: 'Introduction',
  description:
    'What WarmHawk is: self-hosted cold-email infrastructure that runs on your own server, the three tiers (open-core, Self-Hosted Pro, Enterprise DFY), and where to go next in the docs.',
  path: '/docs/introduction',
});

export default function DocsIntroductionPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Get started / Introduction</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        WarmHawk, in one page.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        WarmHawk is cold-email sending infrastructure &mdash; a sending/queueing engine, lead and
        campaign management, AI personalization, and domain-health monitoring &mdash; that runs
        entirely on a server you control. No shared multi-tenant platform, no vendor holding your
        deliverability data.
      </p>
      <AnswerBlock>
        WarmHawk is self-hosted cold-email infrastructure: your own containers, your own Postgres,
        your own nginx and TLS certificate, sending through mailboxes you connect. It ships as a
        free open-core API (Tier 0), a licensed operator dashboard on top of that same engine (Tier
        1, $199/mo), or a fully managed deployment WarmHawk operates for you (Tier 2, $999 +
        $300/mo). Every tier runs the identical sending engine &mdash; what changes is who operates
        the dashboard layer and who carries deployment/support.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">What actually ships</h2>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          A Fastify API (<code className="font-mono">warmhawk-core-engine</code>) with mailbox
          connections (SMTP/IMAP or Google/Microsoft OAuth), lead import (single, CSV, or webhook),
          campaigns with native spintax variation and BYOK AI personalization, a
          jittered/capacity-aware send queue, and domain health checks (SPF/DKIM/DMARC + blocklist
          monitoring).
        </li>
        <li>
          Guardrails enforced structurally, not just documented: CAN-SPAM auto-injection, RFC 8058
          one-click unsubscribe on every send, CSV-injection defense, GDPR erasure, an EU AI Act
          disclosure marker, and a bounce/complaint circuit breaker that auto-pauses a campaign
          before a bad list damages a domain&rsquo;s reputation.
        </li>
        <li>
          On Tier 1/2, a licensed operator dashboard (
          <code className="font-mono">warmhawk-enterprise-operator</code>) with a live queue
          inspector, domain health alerts, a Unified Reply Inbox, team management, and 2FA &mdash;
          bundled Uptime Kuma and native OTEL export on by default.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-semibold mb-4">The three tiers</h2>
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {tiers.map((tier) => (
          <div key={tier.id} className="card bg-cream p-6">
            <div className="label text-ink-muted mb-2">{tier.name}</div>
            <div className="font-display text-2xl font-semibold mb-1">{tier.price}</div>
            <div className="text-[13px] text-ink-muted mb-4">{tier.priceDetail}</div>
            <p className="text-[13.5px] leading-relaxed text-ink-muted">{tier.features[0]}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-muted max-w-2xl mb-14">
        Full breakdown of every feature, tier by tier:{' '}
        <Link href="/compare/pricing" className="text-rust font-semibold">
          the pricing comparison
        </Link>
        .
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <h2 className="font-display text-xl font-semibold mb-3">Where to go next</h2>
        <ul className="space-y-2 text-[15px] text-ink-muted">
          <li>
            New to the API? Start with{' '}
            <Link href="/docs/quickstart" className="text-rust font-semibold">
              Quickstart &amp; installation
            </Link>{' '}
            &mdash; a real send in a handful of curl calls.
          </li>
          <li>
            Running your own instance day to day?{' '}
            <Link href="/docs/guides/connecting-mailboxes" className="text-rust font-semibold">
              Guides
            </Link>{' '}
            cover mailboxes, leads, campaigns, sending safety, and replies.
          </li>
          <li>
            Deploying or maintaining the stack?{' '}
            <Link href="/docs/self-hosting/architecture" className="text-rust font-semibold">
              Self-hosting
            </Link>{' '}
            covers architecture, backups, and TLS/observability.
          </li>
          <li>
            Building against the API directly?{' '}
            <Link href="/docs/api-reference/auth-and-mailboxes" className="text-rust font-semibold">
              API reference
            </Link>{' '}
            documents every endpoint that actually exists today.
          </li>
        </ul>
      </div>
    </div>
  );
}
