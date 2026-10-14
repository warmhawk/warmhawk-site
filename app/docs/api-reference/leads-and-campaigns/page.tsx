import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'API reference: Leads & campaigns',
  description:
    'Full field-by-field reference for every lead route (single, edit, CSV import, webhook, GDPR erasure, blocked list) and every campaign lifecycle route (schedule, preview, test send, duplicate, launch) on WarmHawk’s real /v1 API.',
  path: '/docs/api-reference/leads-and-campaigns',
});

const leadRoutes = [
  {
    route: 'GET /v1/leads?campaignId=',
    desc: 'List leads, optionally scoped to a campaign. Also takes status, q (searches email, name and company; % and _ match as plain text), sort (name, email, company, campaign, status, added) and dir. Returns { leads, total, statusCounts }.',
  },
  {
    route: 'POST /v1/leads',
    desc: 'Single-lead create. Body: campaignId, email, firstName?, lastName?, company?, customFields?. 201, or 409 on suppressed/duplicate.',
  },
  {
    route: 'POST /v1/leads/webhook',
    desc: 'Unauthenticated ingest webhook — no bearer token. Rate-limited (30/min). Skips (200) rather than errors on suppressed/duplicate.',
  },
  {
    route: 'POST /v1/leads/import',
    desc: 'Bulk CSV import — multipart/form-data, fields: campaignId, file. Caps: 50,000 rows / 10MB.',
  },
  {
    route: 'PATCH /v1/leads/:id',
    desc: 'Edit email, firstName, lastName, company or customFields before the lead is emailed. Only an UNTOUCHED lead changes (409 after that); 409 on a blocked or duplicate address, 422 on bad fields. Keeps its place in the send order.',
  },
  {
    route: 'POST /v1/leads/:id/suppress',
    desc: 'Manually suppress a lead (adds to the suppression list, flips status).',
  },
  {
    route: 'DELETE /v1/leads/erase',
    desc: 'GDPR erasure by email. Body: { email }. Anonymizes PII across every campaign, preserves aggregate counts.',
  },
  {
    route: 'DELETE /v1/leads/:id',
    desc: 'Hard delete one lead row by id. 204, or 404 if not found.',
  },
  {
    route: 'GET /v1/suppression?q=&page=',
    desc: 'The blocked list, newest first. Returns { entries, total, page, pageSize }.',
  },
  {
    route: 'POST /v1/suppression/import',
    desc: 'Body: { emails } (up to 10,000). Returns { added, alreadyBlocked, invalid }. 422 when empty.',
  },
  {
    route: 'GET /v1/suppression/export',
    desc: 'Every blocked address: { entries: [{ email, source, reason, createdAt }] }.',
  },
  {
    route: 'POST /v1/suppression/unblock',
    desc: 'Body: { email }. Returns { email, unblocked: true }, or 404 if the address isn’t blocked.',
  },
];

const campaignRoutes = [
  {
    route: 'GET /v1/campaigns',
    desc: 'List campaigns, including mailboxIds, steps, senders (each ticked mailbox and whether its domain has an address), sendWindow, launch { canLaunch, problems }, progress (with followUpsSent, upcomingFollowUps and nextSendAt), aiWrittenCount/aiFallbackCount and leadsCount/sentCount/repliesCount/domainsCount/lastActivityAt.',
  },
  {
    route: 'GET /v1/campaigns/:id',
    desc: 'Fetch one campaign, with mailboxIds and steps. 404 if not found.',
  },
  {
    route: 'GET /v1/campaigns/:id/launch-check',
    desc: 'The launch check without launching. Returns { canLaunch, problems, warnings, passed }.',
  },
  {
    route: 'POST /v1/campaigns',
    desc: 'Create. Body: name, aiPromptTemplate, template?, subject?, aiProvider?, aiMode? (PERSONALIZE or PROMPT), aiWritesSubject?, unsubscribeUrlTemplate?, mailboxIds?, steps?, and the schedule fields sendTimezone?, sendDays?, sendStartMinute?, sendEndMinute?, useLeadTimezone?, maxNewLeadsPerDay?. Returns the row plus contentQuality.',
  },
  {
    route: 'PATCH /v1/campaigns/:id',
    desc: 'Update content and AI fields, the schedule fields, bounceRateThreshold, pausedForBounceRate, mailboxIds or steps. Schedule fields merge with the saved ones; sendTimezone: null clears the schedule. mailboxIds and steps each replace the whole list. status is refused (422): use launch or pause. Recomputes contentQuality when template or subject changes.',
  },
  {
    route: 'POST /v1/campaigns/:id/launch',
    desc: 'Runs the launch check and sets status: ACTIVE. Otherwise 422 with every problem at once: NO_SENDERS, DOMAIN_NO_ADDRESS (one per domain), NO_UNSUBSCRIBE, BOUNCE_PAUSED, EMAIL_EMPTY, STEP_EMPTY, FIELD_UNKNOWN (a {{field}} no lead has), FIELD_BLANK (a field with no fallback that some leads leave blank). Warnings (SENDER_NAME_MISSING, ALL_WARMING, NO_LEADS) never block. A campaign with nothing left to send moves to COMPLETED on its own.',
  },
  {
    route: 'POST /v1/campaigns/preview',
    desc: 'One email exactly as a lead gets it, footer included. Body: campaignId? plus any draft fields to layer over the saved ones, leadIndex? (0–2), step? (0 = first email, 1–3 = a follow-up). With AI on, makes one call on your key. Nothing is stored.',
  },
  {
    route: 'POST /v1/campaigns/:id/test-send',
    desc: 'Sends one [Test] email to { to, step?, leadIndex? } from the first ticked mailbox. Returns { status, to, from, messageId, aiOutcome, aiFallbackReason }. Its unsubscribe link blocks nobody. 422 without a mailbox, address or unsubscribe link; 502 with the mail server’s reason.',
  },
  {
    route: 'POST /v1/campaigns/:id/duplicate',
    desc: 'A new DRAFT named “Copy of …” with the same email, follow-ups, AI settings, unsubscribe link, schedule and senders. Leads, replies and history stay with the original. 201.',
  },
  { route: 'POST /v1/campaigns/:id/pause', desc: 'Sets status: PAUSED.' },
  {
    route: 'DELETE /v1/campaigns/:id',
    desc: 'Archives (status: ARCHIVED) — does not hard-delete.',
  },
];

export default function ApiReferenceLeadsCampaignsPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / API reference / Leads &amp; campaigns</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Leads &amp; campaigns.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Every lead-ingest route and the full campaign lifecycle, field by field. All routes below
        require <code className="font-mono">Authorization: Bearer $WARMHAWK_KEY</code> except{' '}
        <code className="font-mono">POST /v1/leads/webhook</code>, which is deliberately public.
      </p>
      <AnswerBlock>
        Three lead-ingest paths (single create, CSV import, unauthenticated webhook) share one
        validation function and an open customFields object; DELETE /v1/leads/erase handles GDPR
        erasure. Campaigns are created with a template (spintax-capable fallback body) and an
        aiPromptTemplate (mustache-placeholder AI instructions). Each campaign picks the mailboxes
        it sends from (mailboxIds) and can carry up to three follow-ups (steps).
        unsubscribeUrlTemplate is optional: without it every email links to the built-in unsubscribe
        page. An optional send schedule limits sending to set days and hours in one time zone (or
        each lead&rsquo;s). Launch is gated on picked senders, a mailing address on every sending
        domain, a working unsubscribe link, non-empty copy, merge fields every lead can fill and the
        bounce circuit breaker. The blocked list (/v1/suppression) can be searched, imported,
        exported and unblocked.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Leads</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {leadRoutes.map((row) => (
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
      <CodeBlock label="POST /v1/leads/import — multipart, not JSON">
        {`curl -X POST https://your-instance/v1/leads/import \\
  -H "Authorization: Bearer $WARMHAWK_KEY" \\
  -F "campaignId=camp_g7h8i9" \\
  -F "file=@leads.csv"`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Full walkthrough with request/response bodies for every lead route:{' '}
        <Link href="/docs/guides/leads-and-enrichment" className="text-rust font-semibold">
          Leads &amp; enrichment
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Campaigns</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {campaignRoutes.map((row) => (
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
      <CodeBlock label="POST /v1/campaigns — request body">
        {`{
  "name": "Q3 outbound — agencies",
  "template": "Hi there — {quick question|one question} for you today?",
  "aiPromptTemplate": "Write a 2-sentence opener to {{firstName}} at {{company}}.",
  "aiProvider": "GEMINI",
  "aiMode": "PERSONALIZE",
  "unsubscribeUrlTemplate": "https://yourcompany.com/unsubscribe?email={{email}}",
  "mailboxIds": ["mbx_a1b2c3", "mbx_d4e5f6"],
  "steps": [
    { "waitDays": 3, "body": "Just floating this back up — worth a look?", "aiRewrite": false },
    { "waitDays": 4, "body": "Last note from me on this one.", "aiRewrite": false }
  ],
  "sendTimezone": "America/Chicago",
  "sendDays": [1, 2, 3, 4, 5],
  "sendStartMinute": 540,
  "sendEndMinute": 1020,
  "maxNewLeadsPerDay": 50
}`}
      </CodeBlock>
      <CodeBlock label="POST /v1/campaigns/:id/launch — 422 when it can't launch yet">
        {`{
  "error": "acme.com has no mailing address; Follow-up 2 needs backup text",
  "problems": [
    { "code": "DOMAIN_NO_ADDRESS", "message": "acme.com has no mailing address",
      "domainId": "dom_a1b2c3", "domainName": "acme.com", "mailboxCount": 2 },
    { "code": "STEP_EMPTY", "message": "Follow-up 2 needs backup text", "position": 2 }
  ],
  "warnings": []
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        Full field reference, spintax syntax, and the AI personalization mechanics:{' '}
        <Link
          href="/docs/guides/campaigns-ai-and-content-quality"
          className="text-rust font-semibold"
        >
          Campaigns, AI &amp; content quality
        </Link>
        .
      </p>

      <div className="card p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Back to{' '}
          <Link href="/docs/api-reference/auth-and-mailboxes" className="text-rust font-semibold">
            Auth &amp; mailboxes
          </Link>
          , or continue to{' '}
          <Link
            href="/docs/api-reference/queue-domains-and-webhooks"
            className="text-rust font-semibold"
          >
            Queue, domains &amp; webhooks
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
