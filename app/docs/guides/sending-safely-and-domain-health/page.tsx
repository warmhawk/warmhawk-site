import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Sending safely & domain health',
  description:
    'How WarmHawk throttles sends (cadence floor plus jitter), the bounce/complaint circuit breaker, the queue pause API, and domain SPF/DKIM/DMARC placement sampling.',
  path: '/docs/guides/sending-safely-and-domain-health',
});

const faqItems = [
  {
    question: 'What is the 8-minute cadence floor?',
    answer:
      'The minimum spacing the send queue enforces between two sends from the same mailbox, before jitter is layered on top — a structural floor, not a suggestion, so a burst of newly-imported leads can never blast a mailbox at machine speed. The jitter only ever adds, so the real gap is 10.5 to 17.5 minutes, about 14 on average.',
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
  "sentByDay": [ /* sends per day, last 6 days and today */ ],
  "failedToday": 0,
  "queuedByDay": [ /* every queued email, counted by the day it's due */ ],
  "expectedByDay": [ /* what active campaigns are expected to send for the rest of today, then each of the next 7 days */ ],
  "offDays": [ /* days no active campaign sends on, such as a weekend */ ],
  "mailboxes": [ /* each mailbox's sent, warm-up, queued and cap, 2 days either side of today */ ],
  "throttling": {
    "cadenceFloorSeconds": 480,
    "jitterSeconds": 240,
    "minGapSeconds": 630,
    "maxGapSeconds": 1050
  }
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        <code className="font-mono">cadenceFloorSeconds: 480</code> is the real, structural 8-minute
        minimum between two sends from the same mailbox. On top of it goes a random 4 to 8 minutes
        and plus or minus 90 seconds of noise, so sends don&rsquo;t land on a suspiciously exact
        clock tick. The random part only ever adds, so{' '}
        <code className="font-mono">minGapSeconds</code> and{' '}
        <code className="font-mono">maxGapSeconds</code> give the real gap: 10.5 to 17.5 minutes.{' '}
        <code className="font-mono">jobs</code> lists the first 50 waiting/active/delayed jobs;{' '}
        <Link
          href="/docs/api-reference/queue-domains-and-webhooks"
          className="text-rust font-semibold"
        >
          GET /v1/queue/jobs
        </Link>{' '}
        lists every queued email, filtered by mailbox or day. The queue is BullMQ-backed and real
        &mdash; pausing it is a genuine Redis-level pause, not a cosmetic flag:
      </p>
      <CodeBlock label="POST /v1/queue/pause">
        {`curl -X POST https://app.yourcompany.com/v1/queue/pause \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "paused": true }'`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        Watch it in the dashboard: Live Queue
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The Live Queue page shows the same queue, refreshed every 5 seconds:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">Queued, Sending now, Sent today, Failed today.</strong>{' '}
          Emails waiting to go, going now, and the campaign emails that went out or failed since
          midnight UTC. Warm-up emails aren&rsquo;t counted.
        </li>
        <li>
          <strong className="text-ink">Sends by day.</strong> What went out each day this past week,
          then for today and each day ahead what&rsquo;s queued and what your active campaigns are
          expected to send. Today&rsquo;s bar stacks what&rsquo;s still to come on top of what
          already went out, so it isn&rsquo;t empty before your send hours open. Each mailbox only
          books its next email, so the expected count is an estimate from its cap, each
          campaign&rsquo;s send days and hours, follow-ups due and leads left. Replies, bounces and
          unsubscribes end sequences early, so it&rsquo;s usually a little high. A day none of your
          active campaigns sends on, such as a weekend, reads{' '}
          <strong className="text-ink">Off</strong>.
        </li>
        <li>
          <strong className="text-ink">Per-mailbox daily caps.</strong> For each mailbox, what it
          sent against each day&rsquo;s cap for the last two days and today (with what&rsquo;s still
          queued and expected today), then what&rsquo;s queued and expected for the next two.
          Warm-up emails don&rsquo;t count toward the cap, and a warming mailbox shows which warm-up
          day it&rsquo;s on. Each campaign a mailbox sends for gets its own line. Mailboxes with a
          running campaign come first, then warming mailboxes, the furthest along first.
        </li>
        <li>
          <strong className="text-ink">Throttling.</strong> The real gap between emails from one
          mailbox, 10.5 to 17.5 minutes.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Click a mailbox row, a bar on the chart, or <strong className="text-ink">View queue</strong>{' '}
        and a side panel lists the queued emails, grouped by day, soonest first. Open one and you
        see that lead&rsquo;s emails, one tab per step: the ones already sent, the next one with
        when it goes, and later follow-ups with their wait. Each tab shows the campaign text filled
        in for that lead. When AI writes an email, the tab shows the text AI starts from;{' '}
        <strong className="text-ink">Preview with AI</strong> shows a sample of what AI would write.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <strong className="text-ink">Pause queue</strong> on the same page holds every campaign
        until you resume it; nothing is dropped. To stop just one campaign, use Pause on that
        campaign instead.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        Send hours and the daily limit
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Each mailbox has a daily limit (<code className="font-mono">dailyCap</code>), counted over
        the last 24 hours rather than reset at midnight, so a burst late one evening still counts
        the next morning. How the queue uses it:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">Spread, not burst.</strong> With a{' '}
          <Link
            href="/docs/guides/campaigns-ai-and-content-quality"
            className="text-rust font-semibold"
          >
            send schedule
          </Link>{' '}
          the limit is spread across the open hours, never closer together than the 8-minute floor
          plus jitter. A mailbox sending 40 a day over an 8-hour window sends about one every 12
          minutes.
        </li>
        <li>
          <strong className="text-ink">Follow-ups first.</strong> Due follow-ups take the
          day&rsquo;s capacity before new first emails, so a started sequence keeps its timing.
        </li>
        <li>
          <strong className="text-ink">Closed hours wait.</strong> An email that comes due while the
          schedule is closed goes at the next opening, not the moment it was due.
        </li>
        <li>
          <strong className="text-ink">A ramp after warm-up.</strong> A mailbox that has just
          finished{' '}
          <Link href="/docs/guides/warm-up" className="text-rust font-semibold">
            warm-up
          </Link>{' '}
          starts at 5 campaign emails a day and grows 20% a day until it reaches its daily limit.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        A campaign with no schedule sends at any hour, still one email per mailbox every 10.5 to
        17.5 minutes.
      </p>

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
        addressing first, not just waiting out. In the dashboard the campaign shows Stopped:
        bounces, and its Resume button clears the flag after a confirm. A bounced lead has no
        Suppress action: it&rsquo;s never emailed again anyway, and suppressing it would take it out
        of the bounce rate.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Checking an address before the first email
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Optional, and off until you turn it on. Before a lead&rsquo;s first email, the worker asks
        the lead&rsquo;s mail server whether the mailbox exists: it connects on port 25, names the
        lead&rsquo;s address and a made-up one on the same domain, then hangs up. Nothing is sent.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">A clear &ldquo;no such mailbox&rdquo;</strong>, or a domain
          with no mail server at all, stops the lead as <code className="font-mono">FAILED</code>{' '}
          with the reason in its log (&ldquo;Not sent: &hellip; Checked before sending, so nothing
          went out.&rdquo;). It never bounces off your mailbox and doesn&rsquo;t count toward the
          bounce rate or the mailbox&rsquo;s daily sends. The mailbox gets its slot back, so its
          next lead is timed from its last real send, not held back by the dead one.
        </li>
        <li>
          <strong className="text-ink">Anything less clear sends as before</strong>: a timeout, a
          greylist, a block aimed at your server, or a server that accepts every address (which the
          made-up address shows).
        </li>
        <li>
          <strong className="text-ink">Follow-ups skip it.</strong> A lead that got its first email
          already passed.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Your server needs outbound port 25 (many hosts block it until you ask) and a host name whose
        A record is the server&rsquo;s IPv4 address, with reverse DNS (PTR) set back to that name.
        Give the name an SPF record such as <code className="font-mono">v=spf1 a -all</code>. Then
        set it in core&rsquo;s <code className="font-mono">.env/.env</code> and run{' '}
        <code className="font-mono">warmhawk update</code>:
      </p>
      <CodeBlock label=".env/.env">
        {`ADDRESS_CHECK_HELO=mail-check.yourcompany.com
# optional, defaults to check@<ADDRESS_CHECK_HELO>
ADDRESS_CHECK_MAIL_FROM=`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Each check usually adds a few seconds before that lead&rsquo;s first email, well inside the
        10.5 minute gap between sends.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Domain checks: SPF/DKIM/DMARC + blocklists
      </h2>
      <CodeBlock label="POST /v1/domains/:domain/check — keyed by domain NAME">
        {`curl -X POST https://app.yourcompany.com/v1/domains/yourcompany.com/check \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Runs live DNS-TXT resolution for SPF/DKIM/DMARC plus a Spamhaus DBL domain-blocklist lookup
        in one round trip and persists the result on the <code className="font-mono">Domain</code>{' '}
        row. The same full check also runs on its own every hour for every domain, so a DKIM key
        that disappears turns the badge red without anyone pressing Re-check. Blocklist lookups go
        straight to Spamhaus&rsquo;s own nameservers, since Spamhaus refuses public resolvers like
        1.1.1.1 and 8.8.8.8.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <strong>DKIM selectors.</strong> DNS has no way to list a domain&rsquo;s DKIM keys, so
        WarmHawk tries the default selector of every common provider (Google Workspace, Microsoft
        365, Cloudflare, SendGrid, Mailgun, Zoho, Fastmail, Proton, Brevo, Resend, HubSpot and
        more). If none is found the badge reads Pending, not Fail. Providers that mint a selector
        per customer &mdash; Amazon SES, Postmark, ZeptoMail &mdash; need it saved on the domain:
        set <code className="font-mono">dkimSelector</code> (the part before{' '}
        <code className="font-mono">._domainkey</code>) in the dashboard or via{' '}
        <code className="font-mono">PATCH /v1/domains/:id</code>. Once saved, a missing or revoked
        key there is a Fail. A one-off <code className="font-mono">?selector=</code> on the check
        route overrides it for that call.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <strong>Personal mailboxes.</strong> A domain like gmail.com, yahoo.com or outlook.com is
        flagged <code className="font-mono">personalProvider: true</code>. Its DNS belongs to the
        provider, so the checks say so instead of asking you to fix records you can&rsquo;t change,
        and the dashboard doesn&rsquo;t alert on it.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Mailing address per domain</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        CAN-SPAM needs a postal address in every campaign email&rsquo;s footer. WarmHawk keeps it on
        the sending domain, so an agency&rsquo;s client brands each print their own and never share
        one; there is no install-wide fallback. Adding a domain never needs an address. A campaign
        can&rsquo;t launch while any domain it sends from has none, and a mailbox whose domain loses
        its address stops sending until one is added back. Warm-up emails carry no footer and need
        no address.
      </p>
      <CodeBlock label="PATCH /v1/domains/:id — set the address">
        {`curl -X PATCH https://app.yourcompany.com/v1/domains/dom_a1b2c3 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "Acme Logistics",
    "mailingAddressParts": {
      "businessName": "Acme Logistics LLC",
      "street": "100 Main St", "suite": "Suite 200",
      "city": "Denver", "region": "CO", "postalCode": "80202", "country": "USA"
    }
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        <code className="font-mono">mailingAddressParts</code> needs at least street, city and
        country, and WarmHawk builds the printed <code className="font-mono">mailingAddress</code>{' '}
        from it. You can send <code className="font-mono">mailingAddress</code> as one block of text
        instead (up to 500 characters). Clearing an address that campaigns send with returns{' '}
        <code className="font-mono">409 ADDRESS_IN_USE</code> with the campaigns listed; send{' '}
        <code className="font-mono">confirm: true</code> to clear it anyway.{' '}
        <code className="font-mono">PUT /v1/instance-settings</code>, the old install-wide address,
        now answers <code className="font-mono">410 Gone</code>.
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
