import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'API reference: Leads & campaigns',
  description:
    'Full field-by-field reference for every lead-ingest route (single, CSV import, webhook, GDPR erasure) and every campaign lifecycle route on WarmHawk’s real /v1 API.',
  path: '/docs/api-reference/leads-and-campaigns',
});

const leadRoutes = [
  { route: 'GET /v1/leads?campaignId=', desc: 'List leads, optionally scoped to a campaign. Returns { leads, total }.' },
  { route: 'POST /v1/leads', desc: 'Single-lead create. Body: campaignId, email, firstName?, lastName?, company?, customFields?. 201, or 409 on suppressed/duplicate.' },
  { route: 'POST /v1/leads/webhook', desc: 'Unauthenticated ingest webhook — no bearer token. Rate-limited (30/min). Skips (200) rather than errors on suppressed/duplicate.' },
  { route: 'POST /v1/leads/import', desc: 'Bulk CSV import — multipart/form-data, fields: campaignId, file. Caps: 50,000 rows / 10MB.' },
  { route: 'POST /v1/leads/:id/suppress', desc: 'Manually suppress a lead (adds to the suppression list, flips status).' },
  { route: 'DELETE /v1/leads/erase', desc: 'GDPR erasure by email. Body: { email }. Anonymizes PII across every campaign, preserves aggregate counts.' },
  { route: 'DELETE /v1/leads/:id', desc: 'Hard delete one lead row by id. 204, or 404 if not found.' },
];

const campaignRoutes = [
  { route: 'GET /v1/campaigns', desc: 'List campaigns, including leadsCount/sentCount/repliesCount/domainsCount/lastActivityAt.' },
  { route: 'GET /v1/campaigns/:id', desc: 'Fetch one campaign. 404 if not found.' },
  { route: 'POST /v1/campaigns', desc: 'Create. Body: name, aiPromptTemplate, template?, aiProvider?, unsubscribeUrlTemplate?. Returns the row plus contentQuality.' },
  { route: 'PATCH /v1/campaigns/:id', desc: 'Update any content/status field. Recomputes contentQuality when template changes.' },
  { route: 'POST /v1/campaigns/:id/launch', desc: '422 if unsubscribeUrlTemplate is missing, or the campaign is pausedForBounceRate. Otherwise sets status: ACTIVE.' },
  { route: 'POST /v1/campaigns/:id/pause', desc: 'Sets status: PAUSED.' },
  { route: 'DELETE /v1/campaigns/:id', desc: 'Archives (status: ARCHIVED) — does not hard-delete.' },
];

export default function ApiReferenceLeadsCampaignsPage() {
  return (
    <div className="wrap py-16">
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
        aiPromptTemplate (mustache-placeholder AI instructions), and launch is gated on
        unsubscribeUrlTemplate and the bounce circuit breaker.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Leads</h2>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">What it does</th>
            </tr>
          </thead>
          <tbody>
            {leadRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{row.route}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{row.desc}</td>
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
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">What it does</th>
            </tr>
          </thead>
          <tbody>
            {campaignRoutes.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{row.route}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{row.desc}</td>
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
  "unsubscribeUrlTemplate": "https://yourcompany.com/unsubscribe?email={{email}}"
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        Full field reference, spintax syntax, and the AI personalization mechanics:{' '}
        <Link href="/docs/guides/campaigns-ai-and-content-quality" className="text-rust font-semibold">
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
          <Link href="/docs/api-reference/queue-domains-and-webhooks" className="text-rust font-semibold">
            Queue, domains &amp; webhooks
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
