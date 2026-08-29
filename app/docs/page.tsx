import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import {
  type DocLink,
  getStarted,
  guides,
  selfHosting,
  apiReference,
  reference,
  opsAppendix,
} from '@/lib/docsNav';

export const metadata: Metadata = pageSeo({
  title: 'Docs',
  description:
    'WarmHawk documentation: get started, guides for mailboxes/leads/campaigns/sending/replies, self-hosting (architecture, backups, TLS/observability), the full API reference, and guardrails, FAQ & changelog.',
  path: '/docs',
});

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

        <div className="mb-14">
          <a
            href="/openapi.json"
            className="card bg-cream-elevated p-6 flex items-center justify-between gap-4 hover:border-rust transition-colors"
          >
            <div>
              <div className="font-semibold text-base mb-1">OpenAPI spec (openapi.json)</div>
              <div className="text-sm leading-relaxed text-ink-muted">
                Machine-readable OpenAPI 3.0.3 description of every route documented above, for
                coding agents and API clients — not a substitute for the prose reference, a
                companion to it.
              </div>
            </div>
            <span className="font-mono text-xs text-rust flex-none">/openapi.json &rarr;</span>
          </a>
        </div>

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
