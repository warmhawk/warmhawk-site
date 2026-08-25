import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'API reference: Queue, domains & webhooks',
  description:
    'Full field-by-field reference for the send queue, domain SPF/DKIM/DMARC + placement-sample routes on WarmHawk’s real /v1 API. Outbound webhooks are planned — not built yet.',
  path: '/docs/api-reference/queue-domains-and-webhooks',
});

const queueRoutes = [
  { route: 'GET /v1/queue/status', desc: 'Returns { counts, isPaused, jobs, throttling: { cadenceFloorSeconds: 480, jitterSeconds } }.' },
  { route: 'POST /v1/queue/pause', desc: 'Body: { paused: boolean }. Real BullMQ pause/resume, not cosmetic.' },
];

const domainRoutes = [
  { route: 'GET /v1/domains', desc: 'List every sending domain on the account.' },
  { route: 'POST /v1/domains', desc: 'Create. Body: { domainName, redirectUrl? }.' },
  { route: 'PATCH /v1/domains/:id', desc: 'Update redirectUrl.' },
  { route: 'POST /v1/domains/:domain/check', desc: 'Keyed by domain NAME, not id. Unified SPF/DKIM/DMARC + blocklist check. Optional ?selector= for a non-default DKIM selector.' },
  { route: 'GET /v1/domains/:id/placement-sample', desc: 'Keyed by id. Seed-inbox placement sampling rollup — explicitly labeled as sampling, not exhaustive testing.' },
];

export default function ApiReferenceQueueDomainsWebhooksPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / API reference / Queue, domains &amp; webhooks</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Queue, domains &amp; webhooks.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        The send queue, domain health checks, and &mdash; explicitly &mdash; what outbound
        webhooks exist today (none) versus what&rsquo;s planned.
      </p>
      <AnswerBlock>
        GET /v1/queue/status reports real BullMQ counts, pause state, and throttling
        (cadenceFloorSeconds: 480, jitterSeconds); POST /v1/queue/pause is a genuine Redis-level
        pause. Domain routes cover SPF/DKIM/DMARC + blocklist checks (keyed by domain name) and
        seed-inbox placement sampling (keyed by id). Outbound webhooks — WarmHawk calling your URL
        on an event — are Planned; no such system exists in core-engine yet.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Queue</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">What it does</th>
            </tr>
          </thead>
          <tbody>
            {queueRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{row.route}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CodeBlock label="GET /v1/queue/status — response shape">
{`{
  "counts": { "waiting": 3, "active": 1, "delayed": 12, "completed": 240, "failed": 2 },
  "isPaused": false,
  "jobs": [ /* up to 50 waiting/active/delayed jobs */ ],
  "throttling": { "cadenceFloorSeconds": 480, "jitterSeconds": 240 }
}`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Domains</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">What it does</th>
            </tr>
          </thead>
          <tbody>
            {domainRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{row.route}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Note the key: domain checks use the domain <strong className="text-ink">name</strong> (
        <code className="font-mono">POST /v1/domains/yourcompany.com/check</code>), placement
        sampling uses the domain <strong className="text-ink">id</strong> (
        <code className="font-mono">GET /v1/domains/dom_a1b2c3/placement-sample</code>) — every
        other domain route in this table is id-keyed. Full walkthrough with response bodies:{' '}
        <Link href="/docs/guides/sending-safely-and-domain-health" className="text-rust font-semibold">
          Sending safely &amp; domain health
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Webhooks &mdash; Planned</h2>
      <div className="card bg-cream-elevated p-6 max-w-2xl mb-10 border-l-2 border-pending">
        <div className="label text-pending mb-2">Planned, not built</div>
        <p className="text-[14.5px] leading-relaxed text-ink-muted">
          No outbound webhook system exists in <code className="font-mono">warmhawk-core-engine</code> today
          &mdash; there is no route to register a callback URL and no event dispatcher that calls
          it. If you need to react to a WarmHawk event today (a new reply, a send completing,
          a domain going unhealthy), poll the relevant <code className="font-mono">GET</code> route
          instead: <code className="font-mono">GET /v1/replies</code>,{' '}
          <code className="font-mono">GET /v1/queue/status</code>, or{' '}
          <code className="font-mono">GET /v1/domains/:id/placement-sample</code>. This section
          exists to say so plainly rather than leave the gap undocumented.
        </p>
      </div>

      <div className="card p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Back to{' '}
          <Link href="/docs/api-reference/leads-and-campaigns" className="text-rust font-semibold">
            Leads &amp; campaigns
          </Link>{' '}
          or{' '}
          <Link href="/docs/api-reference/auth-and-mailboxes" className="text-rust font-semibold">
            Auth &amp; mailboxes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
