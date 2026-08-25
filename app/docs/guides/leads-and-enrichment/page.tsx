import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Leads & enrichment',
  description:
    'Every way to get leads into WarmHawk — single create, CSV bulk import, unauthenticated webhook ingest — plus GDPR erasure, and the Clay/Apollo recipe for piping enrichment output into customFields and AI prompts.',
  path: '/docs/guides/leads-and-enrichment',
});

const faqItems = [
  {
    question: 'Is CSV import a JSON body or a file upload?',
    answer:
      'A real multipart/form-data file upload — POST /v1/leads/import takes a campaignId field and a file field (the CSV itself), not a JSON array of lead objects. It is capped at 50,000 rows and 10MB per file.',
  },
  {
    question: 'Does the webhook ingest endpoint require an API key?',
    answer:
      "No — POST /v1/leads/webhook is deliberately unauthenticated, built for a third-party tool's outbound webhook that can't hold a bearer token. It rate-limits instead (30 requests/minute) and skips duplicates/suppressed addresses silently rather than erroring, since an automated caller can't act on a 409 anyway.",
  },
  {
    question: 'What actually happens when I erase a lead’s data under GDPR?',
    answer:
      'DELETE /v1/leads/erase anonymizes every matching row’s PII (email, name, company, customFields) across every campaign and stamps piiErasedAt — the row itself stays, so campaign/send/reply aggregate counts stay accurate. It deliberately does not add the address to the suppression list; erasure and suppression are two distinct rights.',
  },
  {
    question: 'Does WarmHawk have its own built-in enrichment?',
    answer:
      "No, and that's intentional. Enrichment is a deep, fast-moving space Clay and Apollo already do well — WarmHawk's job is to accept whatever enrichment output you already have via an open customFields object, not rebuild a worse version of Clay.",
  },
];

export default function LeadsAndEnrichmentPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Guides / Leads &amp; enrichment</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Three ways in, one open field for everything else.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Every lead-ingest path &mdash; single create, CSV import, webhook &mdash; accepts the same{' '}
        <code className="font-mono">email</code>/<code className="font-mono">firstName</code>/
        <code className="font-mono">lastName</code>/<code className="font-mono">company</code> shape
        plus an open <code className="font-mono">customFields</code> object for anything else your
        personalization needs.
      </p>
      <AnswerBlock>
        WarmHawk has three lead-ingest paths sharing one validation function: POST /v1/leads for a
        single authenticated create, POST /v1/leads/import for a CSV bulk upload, and the
        unauthenticated POST /v1/leads/webhook for live pipelines. All three carry an open{' '}
        customFields object, and DELETE /v1/leads/erase handles GDPR right-to-erasure by
        anonymizing PII while preserving aggregate counts.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Single create</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The direct, authenticated entry point &mdash; reports suppression/duplicate conflicts as
        real errors the caller can act on:
      </p>
      <CodeBlock label="POST /v1/leads">
{`curl -X POST https://app.yourcompany.com/v1/leads \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "camp_g7h8i9",
    "email": "jane@prospect-co.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "company": "Prospect Co",
    "customFields": { "jobTitle": "VP Marketing", "recentNews": "closed a $12M Series A" }
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        <code className="font-mono">201</code> with the created lead on success;{' '}
        <code className="font-mono">409</code> if the email is on the suppression list or already a
        lead on that campaign. List leads with{' '}
        <code className="font-mono">GET /v1/leads?campaignId=camp_g7h8i9</code>, which returns{' '}
        <code className="font-mono">{'{ leads, total }'}</code>.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">CSV bulk import</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A real file upload &mdash; <code className="font-mono">multipart/form-data</code>, not a
        JSON body. Send a <code className="font-mono">campaignId</code> field alongside the CSV{' '}
        <code className="font-mono">file</code> field. Any column that isn&rsquo;t{' '}
        <code className="font-mono">email</code>/<code className="font-mono">firstName</code>/
        <code className="font-mono">lastName</code>/<code className="font-mono">company</code> (case-insensitive)
        folds automatically into <code className="font-mono">customFields</code>:
      </p>
      <CodeBlock label="POST /v1/leads/import — multipart, not JSON">
{`curl -X POST https://app.yourcompany.com/v1/leads/import \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "campaignId=camp_g7h8i9" \\
  -F "file=@leads.csv"`}
      </CodeBlock>
      <CodeBlock label="leads.csv">
{`email,firstName,lastName,company,jobTitle,recentNews
jane@prospect-co.com,Jane,Doe,Prospect Co,VP Marketing,closed a $12M Series A`}
      </CodeBlock>
      <CodeBlock label="Response">
{`{ "imported": 1, "skippedDuplicate": 0, "skippedSuppressed": 0, "rejected": [] }`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Capped at 50,000 rows and 10MB per file (<code className="font-mono">413</code> past
        either). Every cell is CSV-injection-defended on ingest &mdash; a value starting with{' '}
        <code className="font-mono">=</code>, <code className="font-mono">+</code>,{' '}
        <code className="font-mono">-</code>, or <code className="font-mono">@</code> is neutralized
        before it&rsquo;s stored, so a malicious lead field can&rsquo;t turn into a spreadsheet
        formula when you later export and open the data.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Webhook ingest &mdash; unauthenticated by design</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Built for a live pipeline pushing rows continuously (Clay, Apollo, a form backend). No
        bearer token &mdash; rate-limited (30/min) instead, and it skips rather than errors on a
        suppressed or duplicate address, since an automated caller has no way to act on a 409:
      </p>
      <CodeBlock label="POST /v1/leads/webhook — no Authorization header">
{`curl -X POST https://app.yourcompany.com/v1/leads/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "camp_g7h8i9",
    "email": "jane@prospect-co.com",
    "firstName": "Jane",
    "company": "Prospect Co",
    "customFields": { "jobTitle": "VP Marketing" }
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Returns <code className="font-mono">201 {'{ status: "queued", leadId }'}</code> on success,{' '}
        <code className="font-mono">200 {'{ status: "skipped", reason: "duplicate" | "suppressed" }'}</code> on
        a skip, or <code className="font-mono">422 {'{ status: "rejected", reason }'}</code> if
        required fields are missing.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">GDPR erasure</h2>
      <CodeBlock label="DELETE /v1/leads/erase — anonymizes, doesn't hard-delete">
{`curl -X DELETE https://app.yourcompany.com/v1/leads/erase \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "jane@prospect-co.com" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Every matching row (across every campaign) has its email/name/company/customFields
        overwritten with a non-reversible placeholder and <code className="font-mono">piiErasedAt</code> stamped
        &mdash; the row itself is kept so send/reply/campaign aggregate counts referencing it stay
        accurate. Returns <code className="font-mono">{'{ email, leadsErased }'}</code>, vacuously
        succeeding with <code className="font-mono">leadsErased: 0</code> if nothing matches. This
        is distinct from <code className="font-mono">DELETE /v1/leads/:id</code>, a real hard
        delete of one row by id, and from a manual suppress (
        <code className="font-mono">POST /v1/leads/:id/suppress</code>) &mdash; erasure removes
        data, suppression stops future sends; a lead who wants both needs both calls.
      </p>

      <div className="border-t border-border pt-10">
        <h2 className="font-display text-2xl font-semibold mb-4">Recipe: Clay / Apollo enrichment</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          Enrich a list in Clay or Apollo first &mdash; job title, company size, recent funding
          news, tech stack, whatever signal makes an email feel specific rather than templated.
          There&rsquo;s nothing WarmHawk-specific about that step. Then map each enriched column
          straight onto a <code className="font-mono">customFields</code> key using whichever
          ingest path fits: CSV import for a one-time export, or the webhook above for Clay&rsquo;s
          own live enrichment table pushing rows as they finish.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          Reference those fields directly in the campaign&rsquo;s <code className="font-mono">aiPromptTemplate</code> (not
          the plain <code className="font-mono">template</code> field, which has no per-lead
          substitution) with a flat <code className="font-mono">{'{{fieldName}}'}</code> placeholder
          &mdash; a customField named <code className="font-mono">recentNews</code> is{' '}
          <code className="font-mono">{'{{recentNews}}'}</code>, never{' '}
          <code className="font-mono">{'{{customFields.recentNews}}'}</code>:
        </p>
        <CodeBlock label="aiPromptTemplate referencing enriched customFields">
{`Write a 2-sentence opener to {{firstName}} at {{company}}, referencing that they
{{recentNews}}. Mention their stack ({{techStack}}) only if it's naturally relevant.
No generic filler, no invented facts.`}
        </CodeBlock>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
          WarmHawk fills whichever placeholders it has data for, then hands the whole lead
          context to your connected Gemini or Claude key (BYOK &mdash; you hold the key, never
          routed through a shared gateway) to write the finished body. See{' '}
          <Link href="/docs/guides/campaigns-ai-and-content-quality" className="text-rust font-semibold">
            Campaigns, AI &amp; content quality
          </Link>{' '}
          for the full personalization mechanics, including what happens when AI is unavailable.
        </p>
      </div>

      <FaqSection items={faqItems} title="Leads & enrichment: questions worth answering up front" />
    </div>
  );
}
