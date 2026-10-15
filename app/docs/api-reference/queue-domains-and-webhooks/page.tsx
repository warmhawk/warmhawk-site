import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'API reference: Queue, domains & webhooks',
  description:
    "Field-by-field reference for WarmHawk's /v1 send queue (status, queued emails, pause), domain SPF/DKIM/DMARC and placement-sample routes. Outbound webhooks are planned, not built yet.",
  path: '/docs/api-reference/queue-domains-and-webhooks',
});

const queueRoutes = [
  {
    route: 'GET /v1/queue/status',
    desc: 'Returns { counts, isPaused, jobs, sentByDay, failedToday, queuedByDay, expectedByDay, offDays, mailboxes, throttling }. counts.waiting, active and delayed count email jobs only, not the nightly system job. counts.completed and counts.failed are BullMQ’s own records (finished jobs kept 24 hours, skipped slots included; crashed jobs kept 7 days), not emails sent or failed: for those, read sentByDay’s today and failedToday, the campaign emails that failed since midnight UTC. jobs is the first 50 pending jobs. sentByDay is sends per UTC day for the last 6 days and today. queuedByDay counts every pending job, not just those 50, by the UTC day it is due (overdue ones count toward today), soonest day first. The queue only holds each mailbox’s next email, so expectedByDay estimates what active campaigns will send for the rest of today and on each of the next 7 UTC days, from each mailbox’s cap (less what it already sent or has booked today), each campaign’s send days and hours, max new leads per day, follow-ups due and leads left (recomputed at most once a minute). offDays lists the UTC days, from 6 days back to 7 ahead, on which no active campaign sends, such as a Monday-to-Friday campaign’s weekend. mailboxes gives each mailbox its campaigns and, for the 2 days either side of today, sent, warmup, queued, expected (0 before today; today, what’s still to come) and cap. throttling carries cadenceFloorSeconds (480), jitterSeconds, and minGapSeconds / maxGapSeconds, the real gap between two sends from one mailbox.',
  },
  {
    route: 'GET /v1/queue/jobs',
    desc: 'Every pending send, soonest first, up to 50, with the full match count in total. ?mailboxId= narrows to one mailbox; ?day=YYYY-MM-DD (UTC) to the sends due that day, with overdue ones counting toward today. Each job has its lead, mailbox, campaign, scheduledFor and step (0 = the first email, N = follow-up N).',
  },
  {
    route: 'POST /v1/queue/pause',
    desc: 'Body: { paused: boolean }. Real BullMQ pause/resume, not cosmetic.',
  },
];

const domainRoutes = [
  {
    route: 'GET /v1/domains',
    desc: 'List every sending domain on the account, each with mailingAddress, label and usedBy (the campaigns sending from it).',
  },
  {
    route: 'POST /v1/domains',
    desc: 'Create. Body: { domainName, redirectUrl?, dkimSelector?, label?, mailingAddress?, mailingAddressParts? }. The address is optional here. dkimSelector is the part before ._domainkey; 422 if it is not a valid DNS label.',
  },
  {
    route: 'PATCH /v1/domains/:id',
    desc: 'Update redirectUrl, dkimSelector, label, linkDomain or the mailing address. Only fields present change; dkimSelector or linkDomain null or "" clears it, and a new linkDomain starts PENDING. Clearing an address that campaigns send with returns 409 ADDRESS_IN_USE unless confirm: true.',
  },
  {
    route: 'POST /v1/domains/:domain/check',
    desc: 'Keyed by domain NAME, not id. Unified SPF/DKIM/DMARC + blocklist check, plus the link domain if one is set. DKIM uses ?selector= if given, else the saved dkimSelector, else tries common provider selectors (a miss is PENDING). Also runs hourly on its own.',
  },
  {
    route: 'POST /v1/domains/:domain/link-domain/check',
    desc: 'Keyed by domain NAME. Opens https://<linkDomain>/unsubscribe/ping and saves linkDomainStatus (PASS or FAIL), linkDomainError and linkDomainCheckedAt. Emails use the link domain only while it is PASS. 422 if the domain has no link domain.',
  },
  {
    route: 'GET /v1/domains/:id/placement-sample',
    desc: 'Keyed by id. Seed-inbox placement sampling rollup — explicitly labeled as sampling, not exhaustive testing.',
  },
];

export default function ApiReferenceQueueDomainsWebhooksPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">
        Docs / API reference / Queue, domains &amp; webhooks
      </div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Queue, domains &amp; webhooks.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        The send queue, domain health checks, and &mdash; explicitly &mdash; what outbound webhooks
        exist today (none) versus what&rsquo;s planned.
      </p>
      <AnswerBlock>
        GET /v1/queue/status reports real BullMQ counts, pause state, sends by day, each
        mailbox&rsquo;s sent, queued and cap counts, and the real gap between sends (10.5 to 17.5
        minutes from one mailbox); GET /v1/queue/jobs lists every queued email, soonest first; POST
        /v1/queue/pause is a genuine Redis-level pause. Domain routes cover SPF/DKIM/DMARC +
        blocklist checks (keyed by domain name) and seed-inbox placement sampling (keyed by id).
        Outbound webhooks — WarmHawk calling your URL on an event — are Planned; no such system
        exists in core-engine yet.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Queue</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {queueRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">
                  {row.route}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CodeBlock label="GET /v1/queue/status — response shape">
        {`{
  "counts": { "waiting": 3, "active": 1, "delayed": 12, "completed": 240, "failed": 2 },
  "isPaused": false,
  "jobs": [ /* the first 50 waiting/active/delayed jobs */ ],
  "sentByDay": [ { "day": "2026-10-14", "count": 38 } /* 7 days, oldest first */ ],
  "failedToday": 0,
  "queuedByDay": [ { "day": "2026-10-15", "count": 3 } /* every pending job, by due day */ ],
  "expectedByDay": [ { "day": "2026-10-14", "count": 12 } /* the rest of today, then 7 days */ ],
  "offDays": [ "2026-10-17", "2026-10-18" ],
  "mailboxes": [
    {
      "id": "mbx_a1b2c3",
      "campaigns": [ { "id": "cmp_x1", "name": "Q4 agencies", "status": "ACTIVE" } ],
      "days": [ { "day": "2026-10-14", "sent": 12, "warmup": 4, "queued": 9, "expected": 0, "cap": 25 } /* 5 days */ ]
    }
  ],
  "throttling": {
    "cadenceFloorSeconds": 480,
    "jitterSeconds": 240,
    "minGapSeconds": 630,
    "maxGapSeconds": 1050
  }
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-6">
        The gap: an 8-minute floor since the mailbox&rsquo;s last send, plus a random 4 to 8
        minutes, plus or minus 90 seconds. The random part only ever adds, so the shortest real gap
        is 10.5 minutes, not 8. Warm-up emails don&rsquo;t count toward{' '}
        <code className="font-mono">cap</code>.
      </p>
      <CodeBlock label="GET /v1/queue/jobs?day=2026-10-15 — response shape">
        {`{
  "total": 27,
  "jobs": [
    {
      "id": "lead_9f2:mbx_a1b2c3:1791999657597",
      "state": "delayed",
      "mailboxEmail": "alex@yourcompany.com",
      "leadEmail": "sam@prospect.com",
      "campaignName": "Q4 agencies",
      "scheduledFor": "2026-10-15T14:05:00.000Z",
      "attemptsMade": 0,
      "leadId": "lead_9f2",
      "campaignId": "cmp_x1",
      "step": 1
    }
  ]
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-6">
        To read the email a queued job will send, pass its <code className="font-mono">leadId</code>{' '}
        and <code className="font-mono">step</code> to{' '}
        <Link href="/docs/api-reference/leads-and-campaigns" className="text-rust font-semibold">
          POST /v1/campaigns/preview
        </Link>{' '}
        with the campaign&rsquo;s id.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Domains</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {domainRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">
                  {row.route}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.desc}
                </td>
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
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Webhooks &mdash; Planned</h2>
      <div className="card bg-cream-elevated p-6 max-w-2xl mb-10 border-l-2 border-pending">
        <div className="label text-pending mb-2">Planned, not built</div>
        <p className="text-[14.5px] leading-relaxed text-ink-muted">
          No outbound webhook system exists in{' '}
          <code className="font-mono">warmhawk-core-engine</code> today &mdash; there is no route to
          register a callback URL and no event dispatcher that calls it. If you need to react to a
          WarmHawk event today (a new reply, a send completing, a domain going unhealthy), poll the
          relevant <code className="font-mono">GET</code> route instead:{' '}
          <code className="font-mono">GET /v1/replies</code>,{' '}
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
