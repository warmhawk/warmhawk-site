import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';

export const metadata: Metadata = pageSeo({
  title: 'Docs — WarmHawk',
  description:
    'WarmHawk documentation: get started, guides for mailboxes/leads/campaigns/sending/replies, self-hosting (architecture, backups, TLS/observability), the full API reference, and guardrails, FAQ & changelog.',
  path: '/docs',
});

interface DocLink {
  href: string;
  title: string;
  body: string;
}

const getStarted: DocLink[] = [
  {
    href: '/docs/introduction',
    title: 'Introduction',
    body: 'What WarmHawk is, what actually ships today, and the three tiers in one page.',
  },
  {
    href: '/docs/quickstart',
    title: 'Quickstart & installation',
    body: 'Install the stack and send a real test email in six curl calls against the real /v1 API.',
  },
];

const guides: DocLink[] = [
  {
    href: '/docs/guides/connecting-mailboxes',
    title: 'Connecting mailboxes',
    body: 'Register a domain, then connect a mailbox via SMTP/IMAP or Google/Microsoft OAuth.',
  },
  {
    href: '/docs/guides/leads-and-enrichment',
    title: 'Leads & enrichment',
    body: 'Single create, CSV bulk import, unauthenticated webhook ingest, GDPR erasure, and the Clay/Apollo recipe.',
  },
  {
    href: '/docs/guides/campaigns-ai-and-content-quality',
    title: 'Campaigns, AI & content quality',
    body: 'Spintax vs BYOK AI personalization, the content-quality score, and the launch/pause lifecycle.',
  },
  {
    href: '/docs/guides/sending-safely-and-domain-health',
    title: 'Sending safely & domain health',
    body: 'The send queue’s cadence floor and jitter, the bounce circuit breaker, and domain health checks.',
  },
  {
    href: '/docs/guides/replies-and-team',
    title: 'Replies & team',
    body: 'IMAP reply polling and AI classification, automatic opt-out suppression, and Tier 1/2 team access.',
  },
];

const selfHosting: DocLink[] = [
  {
    href: '/docs/self-hosting/architecture',
    title: 'Architecture',
    body: 'Every docker compose service, the internal-only network boundary, logs, and resource limits.',
  },
  {
    href: '/docs/self-hosting/backups-and-redis-durability',
    title: 'Backups & Redis durability',
    body: 'Nightly Postgres backups and the full restore procedure, plus why Redis runs AOF-durable.',
  },
  {
    href: '/docs/self-hosting/tls-and-observability',
    title: 'TLS & observability',
    body: 'Certbot issuance/renewal that fails safe, BYO-cert, bundled Uptime Kuma, and native OTEL export.',
  },
];

const apiReference: DocLink[] = [
  {
    href: '/docs/api-reference/auth-and-mailboxes',
    title: 'Auth & mailboxes',
    body: 'POST /v1/auth/login and the full mailbox CRUD + OAuth-connect routes.',
  },
  {
    href: '/docs/api-reference/leads-and-campaigns',
    title: 'Leads & campaigns',
    body: 'Every lead-ingest route and the full campaign lifecycle, field by field.',
  },
  {
    href: '/docs/api-reference/queue-domains-and-webhooks',
    title: 'Queue, domains & webhooks',
    body: 'Queue status/pause, domain health checks — and an honest “Planned” notice for outbound webhooks.',
  },
];

const reference: DocLink[] = [
  {
    href: '/docs/reference/guardrails-and-compliance',
    title: 'Guardrails & compliance',
    body: 'CAN-SPAM, RFC 8058, EU AI Act disclosure, GDPR erasure, the bounce circuit breaker, and rate limits.',
  },
  {
    href: '/docs/reference/faq-and-changelog',
    title: 'FAQ & changelog',
    body: 'Common orientation questions, plus what’s actually shipped in each repo so far.',
  },
];

const opsAppendix: DocLink[] = [
  {
    href: '/docs/install-troubleshooting',
    title: 'install.sh troubleshooting',
    body: 'Docker missing, ports already bound, DNS not propagated yet, and safe re-runs.',
  },
  {
    href: '/docs/update-failures',
    title: 'warmhawk update failures',
    body: 'What warmhawk update does, a stuck migration, and rolling back a bad update.',
  },
  {
    href: '/docs/license-activation',
    title: 'License activation troubleshooting',
    body: '“License invalid”/“expired” errors, LicenseGate’s daily re-check, and paid-but-unlicensed.',
  },
  {
    href: '/docs/stripe-webhooks',
    title: 'Stripe checkout & webhooks',
    body: 'What the checkout webhook does, a missing install-command email, and the Customer Portal.',
  },
];

function DocCard({ link }: { link: DocLink }) {
  return (
    <Link href={link.href} className="card bg-cream p-6 block hover:border-rust transition-colors">
      <div className="font-semibold text-base mb-2">{link.title}</div>
      <div className="text-sm leading-relaxed text-ink-muted">{link.body}</div>
    </Link>
  );
}

function DocGroup({ label, links }: { label: string; links: DocLink[] }) {
  return (
    <div className="mb-14">
      <div className="label text-rust mb-5">{label}</div>
      <div className="grid sm:grid-cols-2 gap-5">
        {links.map((link) => (
          <DocCard key={link.href} link={link} />
        ))}
      </div>
    </div>
  );
}

export default function DocsIndexPage() {
  return (
    <div className="wrap py-16">
      {/* Label + H1 match the artifact's docs-landing subhero verbatim
          (#page-docs: `<p class="eyebrow">Documentation</p>` /
          `<h1>Everything you need to run WarmHawk.</h1>`), same as the
          homepage's hero-copy fidelity. The paragraph and AnswerBlock below
          stay as the site's own, more specific self-hosting value prop
          rather than the artifact's generic placeholder line — real copy,
          not a dilution. */}
      <div className="label text-rust mb-5">Documentation</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Everything you need to run WarmHawk.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        WarmHawk is self-hosted &mdash; your own containers, your own nginx, your own TLS
        certificate, your own Postgres. That means most of what goes wrong is something you can
        see and fix on your own server in a few minutes, without waiting on a support queue.
      </p>
      <AnswerBlock>
        This page indexes all of WarmHawk&rsquo;s documentation: getting started, guides for
        day-to-day operation (mailboxes, leads, campaigns, sending safety, replies),
        self-hosting (architecture, backups, TLS/observability), the full API reference, and a
        reference section (guardrails, FAQ &amp; changelog) — plus an operations appendix for
        install/update/billing troubleshooting. Start with Introduction if you&rsquo;re new, or
        jump straight to the page that answers what you&rsquo;re stuck on.
      </AnswerBlock>

      <div className="mt-14">
        <DocGroup label="Get started" links={getStarted} />
        <DocGroup label="Guides" links={guides} />
        <DocGroup label="Self-hosting" links={selfHosting} />
        <DocGroup label="API reference" links={apiReference} />
        <DocGroup label="Reference" links={reference} />

        <div className="mb-4">
          <div className="label text-ink-muted mb-2">Operations appendix</div>
          <p className="text-sm text-ink-muted max-w-2xl mb-5">
            Real troubleshooting content that doesn&rsquo;t fit the sections above — still fully
            documented and linked, just not part of the core 15-page structure.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {opsAppendix.map((link) => (
              <DocCard key={link.href} link={link} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
