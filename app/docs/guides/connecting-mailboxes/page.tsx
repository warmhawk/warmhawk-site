import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Connecting mailboxes',
  description:
    'How to register a sending domain and connect a mailbox in WarmHawk — plain SMTP/IMAP credentials or the Google Workspace / Microsoft 365 OAuth flow — plus dailyCap and mailbox management.',
  path: '/docs/guides/connecting-mailboxes',
});

const faqItems = [
  {
    question: 'Do I need to create a domain before a mailbox?',
    answer:
      'Yes. POST /v1/mailboxes requires a domainId, so create the Domain (POST /v1/domains) first — a mailbox always belongs to exactly one sending domain.',
  },
  {
    question: 'What happens to my SMTP/IMAP password after I send it?',
    answer:
      'It is encrypted server-side (AES-256-GCM) before being persisted, and is never echoed back in any API response — not even to the authenticated caller who just set it.',
  },
  {
    question: 'Can I connect more than one mailbox per domain?',
    answer:
      'Yes, and it is the normal setup — the send queue rotates weighted across every active mailbox on a campaign rather than hammering one inbox.',
  },
  {
    question: 'What does dailyCap actually limit?',
    answer:
      "The maximum sends the queue will schedule through that specific mailbox in a rolling day, independent of any other mailbox's cap — it defaults to a conservative 25 if you don't set one.",
  },
];

export default function ConnectingMailboxesPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Guides / Connecting mailboxes</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        A mailbox is one sending identity, on one domain.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Every mailbox WarmHawk sends from belongs to exactly one <code className="font-mono">Domain</code> row
        and is connected one of two ways: plain SMTP/IMAP credentials, or an OAuth consent flow for
        Google Workspace / Microsoft 365.
      </p>
      <AnswerBlock>
        Connecting a mailbox is two steps: register the sending domain (POST /v1/domains), then
        create the mailbox against it (POST /v1/mailboxes) — either with SMTP/IMAP credentials
        directly, or by creating a credential-less mailbox row first and completing OAuth consent
        against GET /v1/oauth/:provider/authorize?mailboxId=&lt;id&gt; for Google or Microsoft.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">1. Register the sending domain</h2>
      <CodeBlock label="POST /v1/domains">
{`curl -X POST https://app.yourcompany.com/v1/domains \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "domainName": "yourcompany.com" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        List existing domains with <code className="font-mono">GET /v1/domains</code>, or update a
        domain&rsquo;s redirect URL with <code className="font-mono">PATCH /v1/domains/:id</code>.
        Checking SPF/DKIM/DMARC and blocklist status for a domain is covered in{' '}
        <Link href="/docs/guides/sending-safely-and-domain-health" className="text-rust font-semibold">
          Sending safely &amp; domain health
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">2a. Connect via SMTP/IMAP</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        For any provider that isn&rsquo;t Google Workspace or Microsoft 365 (or those, if you
        prefer app-password auth over OAuth), pass credentials directly. Every field except{' '}
        <code className="font-mono">email</code> and <code className="font-mono">domainId</code> is
        optional at the type level, but a real SMTP/IMAP mailbox needs the connection fields filled
        in:
      </p>
      <CodeBlock label="POST /v1/mailboxes">
{`curl -X POST https://app.yourcompany.com/v1/mailboxes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@yourcompany.com",
    "domainId": "dom_a1b2c3",
    "provider": "SMTP_CUSTOM",
    "smtpHost": "smtp.yourdomain.com",
    "smtpPort": 587,
    "imapHost": "imap.yourdomain.com",
    "imapPort": 993,
    "authUsername": "you@yourcompany.com",
    "authPassword": "YOUR_SMTP_PASSWORD",
    "dailyCap": 25
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        The response (201) returns the created <code className="font-mono">Mailbox</code> row with{' '}
        <code className="font-mono">authPassword</code> stripped out — it&rsquo;s encrypted at rest
        and never round-tripped back to any caller, ever.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">2b. Connect via Google Workspace or Microsoft 365 OAuth</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Create the mailbox row first &mdash; without <code className="font-mono">authPassword</code> &mdash;
        so you have a <code className="font-mono">mailboxId</code> to bind the OAuth flow to:
      </p>
      <CodeBlock label="POST /v1/mailboxes (credential-less, OAuth to follow)">
{`curl -X POST https://app.yourcompany.com/v1/mailboxes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "you@yourcompany.com", "domainId": "dom_a1b2c3", "provider": "GOOGLE_WORKSPACE" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Then send the browser (not a background curl call — this is a real consent redirect) to:
      </p>
      <CodeBlock label="GET /v1/oauth/:provider/authorize?mailboxId=<id>">
{`https://app.yourcompany.com/v1/oauth/google/authorize?mailboxId=mbx_a1b2c3
# or: https://app.yourcompany.com/v1/oauth/microsoft/authorize?mailboxId=mbx_a1b2c3`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        That redirects to Google&rsquo;s or Microsoft&rsquo;s own consent screen, signed with a
        short-lived <code className="font-mono">state</code> parameter binding it back to that{' '}
        <code className="font-mono">mailboxId</code>. On success, the provider calls{' '}
        <code className="font-mono">GET /v1/oauth/:provider/callback?code=&amp;state=</code> &mdash;
        a public endpoint with no bearer auth (protected by the signed <code className="font-mono">state</code> instead,
        since the provider itself is the caller) &mdash; which stores an AES-256-GCM-encrypted
        refresh token against the mailbox and redirects the browser to the dashboard&rsquo;s{' '}
        <code className="font-mono">/dashboard/mailboxes</code> page (or back with an{' '}
        <code className="font-mono">?oauth_error=</code> query param if consent was denied or the
        token exchange failed).
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Managing a mailbox afterward</h2>
      <CodeBlock label="GET /v1/mailboxes — list every connected mailbox">
{`curl https://app.yourcompany.com/v1/mailboxes -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="PATCH /v1/mailboxes/:id — adjust status or dailyCap">
{`curl -X PATCH https://app.yourcompany.com/v1/mailboxes/mbx_a1b2c3 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "dailyCap": 40 }'`}
      </CodeBlock>
      <CodeBlock label="DELETE /v1/mailboxes/:id — disconnect it">
{`curl -X DELETE https://app.yourcompany.com/v1/mailboxes/mbx_a1b2c3 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>

      <div className="card bg-cream-elevated p-7 max-w-2xl mt-10 mb-4">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          A mailbox that stops authenticating (an expired OAuth token, a rotated app password)
          shows up as failed sends in the queue, not as a separate alert channel today &mdash; see{' '}
          <Link href="/docs/guides/sending-safely-and-domain-health" className="text-rust font-semibold">
            Sending safely &amp; domain health
          </Link>{' '}
          for how to read queue state and what the bounce circuit breaker does if a broken mailbox
          keeps failing.
        </p>
      </div>

      <FaqSection items={faqItems} title="Connecting mailboxes: questions worth answering up front" />
    </div>
  );
}
