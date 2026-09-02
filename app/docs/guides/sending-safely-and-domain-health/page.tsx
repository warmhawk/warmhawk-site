import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Sending safely & domain health',
  description:
    'How WarmHawk throttles sends (cadence floor + jitter), the bounce/complaint circuit breaker that auto-pauses a bad list, the queue status/pause API, and domain SPF/DKIM/DMARC + seed-inbox placement sampling.',
  path: '/docs/guides/sending-safely-and-domain-health',
});

const faqItems = [
  {
    question: 'What is the 8-minute cadence floor?',
    answer:
      'The minimum spacing the send queue enforces between two sends from the same mailbox, before jitter is layered on top — a structural floor, not a suggestion, so a burst of newly-imported leads can never blast a mailbox at machine speed.',
  },
  {
    question: 'What triggers the bounce circuit breaker, and what does it do?',
    answer:
      'A rolling bounce rate above 5% on a campaign/mailbox pair, but only once at least 20 sends have happened (so one bounce out of two sends never trips it). Once tripped, the campaign is flagged pausedForBounceRate and further launches are refused with a 422 until it is explicitly resumed.',
  },
  {
    question: 'Is placement sampling the same thing as a warmup "heat score"?',
    answer:
      'No, and WarmHawk is deliberate about the distinction. Placement sampling BCCs real campaign sends to a small, fixed set of seed inboxes you own and reports which folder each landed in — a real, first-party signal from an actual send, explicitly labeled as sampling across N seed inboxes, never marketed as exhaustive inbox-placement testing.',
  },
  {
    question: 'Is a domain health check keyed by domain id or domain name?',
    answer:
      "POST /v1/domains/:domain/check is keyed by the domain NAME (e.g. yourcompany.com), unlike this API's other domain routes which use the internal id — it's the shape a customer actually thinks in when re-checking a domain.",
  },
];

export default function SendingSafelyDomainHealthPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Guides / Sending safely &amp; domain health</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Guardrails that protect a domain before it&rsquo;s trashed, not after.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Three layers work together: a throttled, jittered send queue; a bounce circuit breaker that
        auto-pauses a bad list; and domain health checks &mdash; SPF/DKIM/DMARC, blocklist status,
        and seed-inbox placement sampling &mdash; you can pull on demand.
      </p>
      <AnswerBlock>
        WarmHawk protects domain reputation structurally: the send queue enforces an 8-minute
        cadence floor plus jitter per mailbox, a bounce/complaint circuit breaker auto-pauses a
        campaign once its rolling bounce rate crosses 5% on at least 20 sends, and GET
        /v1/domains/:id/placement-sample reports real seed-inbox placement results — never a
        self-reported score.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Queue: status and pause</h2>
      <CodeBlock label="GET /v1/queue/status">
        {`curl https://app.yourcompany.com/v1/queue/status -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="Response">
        {`{
  "counts": { "waiting": 3, "active": 1, "delayed": 12, "completed": 240, "failed": 2 },
  "isPaused": false,
  "jobs": [
    {
      "id": "1042",
      "state": "delayed",
      "mailboxEmail": "you@yourcompany.com",
      "leadEmail": "jane@prospect-co.com",
      "campaignName": "Q3 outbound — agencies",
      "scheduledFor": "2026-08-23T18:04:00.000Z",
      "attemptsMade": 0
    }
  ],
  "throttling": { "cadenceFloorSeconds": 480, "jitterSeconds": 240 }
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        <code className="font-mono">cadenceFloorSeconds: 480</code> is the real, structural 8-minute
        minimum between two sends from the same mailbox;{' '}
        <code className="font-mono">jitterSeconds</code> is the representative width of the
        randomized delay layered on top so sends don&rsquo;t land on a suspiciously exact clock
        tick. <code className="font-mono">jobs</code> lists up to 50 waiting/active/delayed jobs;
        the queue is BullMQ-backed and real &mdash; pausing it is a genuine Redis-level pause, not a
        cosmetic flag:
      </p>
      <CodeBlock label="POST /v1/queue/pause">
        {`curl -X POST https://app.yourcompany.com/v1/queue/pause \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "paused": true }'`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">The bounce circuit breaker</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Evaluated from real <code className="font-mono">ExecutionLog</code> data, not a separate
        monitoring system: once a campaign/mailbox pair has at least 20 sends and its bounce rate
        exceeds 5% (both configurable via a campaign&rsquo;s{' '}
        <code className="font-mono">bounceRateThreshold</code>), it flips{' '}
        <code className="font-mono">pausedForBounceRate: true</code>. From that point,{' '}
        <code className="font-mono">POST /v1/campaigns/:id/launch</code> refuses with{' '}
        <code className="font-mono">422</code> until a human clears the flag via{' '}
        <code className="font-mono">
          PATCH /v1/campaigns/:id {'{ "pausedForBounceRate": false }'}
        </code>{' '}
        &mdash; deliberately not an automatic reset, since the underlying list-quality problem needs
        addressing first, not just waiting out.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Domain checks: SPF/DKIM/DMARC + blocklists
      </h2>
      <CodeBlock label="POST /v1/domains/:domain/check — keyed by domain NAME">
        {`curl -X POST https://app.yourcompany.com/v1/domains/yourcompany.com/check \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Runs live DNS-TXT resolution for SPF/DKIM/DMARC plus continuous DNSBL monitoring (Spamhaus
        ZEN/DBL, Barracuda, SORBS) in one round trip and persists the result on the{' '}
        <code className="font-mono">Domain</code> row. An optional{' '}
        <code className="font-mono">?selector=</code> query param targets a non-default DKIM
        selector.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Seed-inbox placement sampling</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A small, fixed set of email accounts you own are BCC&rsquo;d on real campaign sends;
        WarmHawk reports which folder each one landed in &mdash; inbox, spam, or promotions. Manage
        the seed inboxes via{' '}
        <code className="font-mono">GET/POST/PATCH/DELETE /v1/seed-accounts</code>, then pull the
        rollup per domain:
      </p>
      <CodeBlock label="GET /v1/domains/:id/placement-sample — id-keyed">
        {`curl https://app.yourcompany.com/v1/domains/dom_a1b2c3/placement-sample \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="Response">
        {`{
  "domainId": "dom_a1b2c3",
  "domainName": "yourcompany.com",
  "label": "Placement sampling across 4 seed inboxes — not full inbox-placement testing.",
  "sampledSeedAccountCount": 4,
  "totalChecks": 18,
  "byFolder": { "INBOX": 12, "SPAM": 3, "PROMOTIONS": 3, "UNCLASSIFIED": 0 },
  "inboxPlacementRate": 0.667,
  "mostRecentCheckAt": "2026-08-22T09:14:00.000Z",
  "results": []
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        The response is deliberately, explicitly labeled &ldquo;placement sampling,&rdquo; never
        &ldquo;inbox-placement testing&rdquo; &mdash; a small owned sample is directional evidence
        from real sends, not a statistically exhaustive placement panel, and WarmHawk doesn&rsquo;t
        market it as one.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Every structural guardrail on this page &mdash; the cadence floor, the circuit breaker,
          CAN-SPAM enforcement &mdash; is covered end to end, alongside CSV-injection defense and
          GDPR erasure, in{' '}
          <Link
            href="/docs/reference/guardrails-and-compliance"
            className="text-rust font-semibold"
          >
            Guardrails &amp; compliance
          </Link>
          .
        </p>
      </div>

      <FaqSection
        items={faqItems}
        title="Sending safely & domain health: questions worth answering up front"
      />
    </div>
  );
}
