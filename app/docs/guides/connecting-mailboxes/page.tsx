import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Connecting mailboxes',
  description:
    'Register a sending domain and connect a mailbox in WarmHawk with SMTP/IMAP credentials or Google Workspace / Microsoft 365 OAuth, plus dailyCap and management.',
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
      'WarmHawk signs in to your SMTP and IMAP servers once to check it, then encrypts it server-side (AES-256-GCM) before it is persisted. It is never echoed back in any API response — not even to the authenticated caller who just set it.',
  },
  {
    question: 'Why does my Google Workspace admin have to trust WarmHawk?',
    answer:
      "Google blocks third-party apps that ask for full Gmail access until a Workspace admin marks them trusted. It is a one-time step per company, in admin.google.com, and every mailbox on that Workspace can connect afterward. Personal @gmail.com addresses can't be trusted this way, so connect those with an app password over SMTP/IMAP.",
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
        Every mailbox WarmHawk sends from belongs to exactly one{' '}
        <code className="font-mono">Domain</code> row and is connected one of two ways: plain
        SMTP/IMAP credentials, or an OAuth consent flow for Google Workspace / Microsoft 365.
      </p>
      <AnswerBlock>
        Connecting a mailbox is two steps: register the sending domain (POST /v1/domains), then
        create the mailbox against it (POST /v1/mailboxes) — either with SMTP/IMAP credentials
        directly, or by creating a credential-less mailbox row first and completing OAuth consent
        against GET /v1/oauth/:provider/authorize?mailboxId=&lt;id&gt; for Google or Microsoft.
      </AnswerBlock>

      <div className="card bg-rust-tint border-rust px-6 py-5 mb-10 max-w-2xl">
        <p className="text-[14px] leading-relaxed text-ink">
          <span className="font-semibold text-rust">On Tier 1 or Tier 2?</span> Skip the API steps.
          In your dashboard, open Mailboxes, enter the address, and click{' '}
          <strong>Connect with Google</strong> or <strong>Connect with Microsoft</strong>. WarmHawk
          Connect handles the sign-in, so there is no OAuth app to build. The one step your company
          does once is below.
        </p>
      </div>

      <h2 id="google-workspace-trust" className="font-display text-2xl font-semibold mb-4">
        Google Workspace: trust WarmHawk once
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Google blocks apps that ask for full Gmail access until your Workspace admin trusts them. It
        takes about a minute, once per company:
      </p>
      <ol className="list-decimal pl-6 mb-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted space-y-1.5">
        <li>
          In your WarmHawk dashboard, open Mailboxes and copy the client ID shown under{' '}
          <strong>Google Workspace: trust WarmHawk once</strong>.
        </li>
        <li>Open admin.google.com as a super admin.</li>
        <li>
          Go to Security &rarr; Access and data control &rarr; API controls &rarr; Manage
          third-party app access.
        </li>
        <li>Click Configure new app, search for the client ID, and select WarmHawk.</li>
        <li>Choose your whole organization, then Trusted &rarr; Configure.</li>
      </ol>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Then connect each mailbox from the Mailboxes page. If Google&rsquo;s consent screen shows a
        checkbox for Gmail access, tick it &mdash; without it the mailbox can&rsquo;t send, and
        WarmHawk will ask you to try again.
      </p>
      <ul className="list-disc pl-6 mb-10 max-w-2xl text-[15px] leading-relaxed text-ink-muted space-y-1.5">
        <li>
          <strong className="text-ink">Personal @gmail.com?</strong> It can&rsquo;t be trusted by an
          admin. Use the SMTP/IMAP form with an app password instead.
        </li>
        <li>
          <strong className="text-ink">Microsoft 365?</strong> Click Connect with Microsoft. Your
          Microsoft 365 admin approves WarmHawk once for the whole company. If you aren&rsquo;t the
          admin, Microsoft shows &ldquo;Need admin approval&rdquo;: copy the approval link from the
          Mailboxes page and send it to them.
        </li>
        <li>
          <strong className="text-ink">Rather use your own OAuth app?</strong> Register it under
          Settings in your dashboard. When one is set, it is used instead of Connect, and nothing
          passes through warmhawk.com.
        </li>
      </ul>

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
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">2a. Connect via SMTP/IMAP</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        For any provider that isn&rsquo;t Google Workspace or Microsoft 365 (or those, if you prefer
        app-password auth over OAuth), pass credentials directly. Every field except{' '}
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
    "senderName": "Sam Patel",
    "dailyCap": 25
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        The response (201) returns the created <code className="font-mono">Mailbox</code> row with{' '}
        <code className="font-mono">authPassword</code> stripped out — it&rsquo;s encrypted at rest
        and never round-tripped back to any caller, ever.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Before saving, WarmHawk signs in to the SMTP and IMAP servers once with that password. If
        either refuses, you get a <code className="font-mono">422</code> with a sentence saying what
        to fix, and nothing is saved &mdash; Google Workspace and Microsoft 365 usually need an app
        password here, not the account password. An address that&rsquo;s already connected gets a{' '}
        <code className="font-mono">409</code>. Every status is listed in the{' '}
        <Link
          href="/docs/api-reference/auth-and-mailboxes#sign-in-check"
          className="text-rust font-semibold"
        >
          API reference
        </Link>
        .
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <code className="font-mono">senderName</code> is the From name leads see and what{' '}
        <code className="font-mono">{'{{senderName}}'}</code> fills in campaigns. Up to 80
        characters. The API still accepts a mailbox without one, but its mail then goes out from the
        bare address, so the dashboard asks for it.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        2b. Connect via Google Workspace or Microsoft 365 OAuth
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Create the mailbox row first &mdash; without <code className="font-mono">authPassword</code>{' '}
        &mdash; so you have a <code className="font-mono">mailboxId</code> to bind the OAuth flow
        to:
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
        a public endpoint with no bearer auth (protected by the signed{' '}
        <code className="font-mono">state</code> instead, since the provider itself is the caller)
        &mdash; which stores an AES-256-GCM-encrypted refresh token against the mailbox and
        redirects the browser to the dashboard&rsquo;s{' '}
        <code className="font-mono">/dashboard/mailboxes</code> page (or back with an{' '}
        <code className="font-mono">?oauth_error=</code> query param if consent was denied or the
        token exchange failed).
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl -mt-6 mb-10">
        On connect, WarmHawk copies the name the provider already shows for the mailbox &mdash;
        Gmail&rsquo;s send-as name, or the Microsoft 365 account&rsquo;s display name over WarmHawk
        Connect &mdash; into <code className="font-mono">senderName</code>, unless one is already
        set. If the provider has none, the dashboard asks for it after the redirect.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Managing a mailbox afterward</h2>
      <CodeBlock label="GET /v1/mailboxes — list every connected mailbox">
        {`curl https://app.yourcompany.com/v1/mailboxes -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="PATCH /v1/mailboxes/:id — adjust status, dailyCap or senderName">
        {`curl -X PATCH https://app.yourcompany.com/v1/mailboxes/mbx_a1b2c3 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "dailyCap": 40, "senderName": "Sam Patel" }'`}
      </CodeBlock>
      <CodeBlock label="DELETE /v1/mailboxes/:id — disconnect it">
        {`curl -X DELETE https://app.yourcompany.com/v1/mailboxes/mbx_a1b2c3 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>

      <div className="card bg-cream-elevated p-7 max-w-2xl mt-10 mb-4">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          A mailbox that stops authenticating (an expired OAuth token, a rotated app password) shows
          up as failed sends in the queue, not as a separate alert channel today &mdash; see{' '}
          <Link
            href="/docs/guides/sending-safely-and-domain-health"
            className="text-rust font-semibold"
          >
            Sending safely &amp; domain health
          </Link>{' '}
          for how to read queue state and what the bounce circuit breaker does if a broken mailbox
          keeps failing.
        </p>
      </div>

      <FaqSection
        items={faqItems}
        title="Connecting mailboxes: questions worth answering up front"
      />
    </div>
  );
}
