import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'API reference: Auth & mailboxes',
  description:
    'Full field-by-field reference for POST /v1/auth/login and the mailbox CRUD + OAuth-connect routes on WarmHawk’s real /v1 API.',
  path: '/docs/api-reference/auth-and-mailboxes',
});

export default function ApiReferenceAuthMailboxesPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / API reference / Auth &amp; mailboxes</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Auth &amp; mailboxes.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        The real, current shape of every <code className="font-mono">/v1</code> route in this
        section, as shipped in <code className="font-mono">warmhawk-core-engine</code>. Every
        example is copy-pasteable against a real instance.
      </p>
      <AnswerBlock>
        Base URL is https://your-instance/v1. Every route requires Authorization: Bearer
        &lt;token&gt; except POST /v1/auth/login (which issues the token) and the two OAuth routes
        (public, protected by a signed state param instead). This page covers auth and the full
        mailbox lifecycle — create, list, update, delete, and both connection paths (SMTP/IMAP
        credentials or Google/Microsoft OAuth).
      </AnswerBlock>

      <div className="card bg-cream-elevated p-6 max-w-2xl mb-12">
        <div className="label text-ink-muted mb-2">Base URL &amp; auth</div>
        <p className="text-[14px] leading-relaxed text-ink-muted">
          <code className="font-mono">https://your-instance/v1</code> &mdash; every route below (and
          across{' '}
          <Link href="/docs/api-reference/leads-and-campaigns" className="text-rust font-semibold">
            Leads &amp; campaigns
          </Link>{' '}
          and{' '}
          <Link
            href="/docs/api-reference/queue-domains-and-webhooks"
            className="text-rust font-semibold"
          >
            Queue, domains &amp; webhooks
          </Link>
          ) requires <code className="font-mono">Authorization: Bearer $WARMHAWK_KEY</code>,
          obtained from <code className="font-mono">POST /v1/auth/login</code>, except that route
          itself and the two OAuth endpoints below, which are public by design.
        </p>
      </div>

      <h2 className="font-display text-2xl font-semibold mb-4">POST /v1/auth/login</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Authenticates against the engine&rsquo;s own <code className="font-mono">User</code> table
        &mdash; separate from the Tier 1/2 dashboard&rsquo;s own login. Rate-limited (10/min) and
        brute-force locked out per account, both layers active at once.
      </p>
      <CodeBlock label="Request">
        {`POST /v1/auth/login
Content-Type: application/json

{ "email": "you@yourcompany.com", "password": "YOUR_PASSWORD" }`}
      </CodeBlock>
      <CodeBlock label="Response — 200">{`{ "token": "YOUR_API_KEY" }`}</CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        <code className="font-mono">401</code> for invalid credentials (constant response shape
        whether the account exists or not, to avoid user enumeration).{' '}
        <code className="font-mono">429</code> with <code className="font-mono">retryAfterMs</code>{' '}
        once an account is locked from repeated failures.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Mailboxes</h2>
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
            {[
              { route: 'GET /v1/mailboxes', desc: 'List every mailbox on the account.' },
              {
                route: 'POST /v1/mailboxes',
                desc: 'Create a mailbox. Requires email + domainId. With a password, signs in to the SMTP and IMAP servers first. 201 with the created row (credentials stripped); 409 if the address is already connected; 422 if a sign-in is refused.',
              },
              {
                route: 'PATCH /v1/mailboxes/:id',
                desc: 'Update status, dailyCap or senderName. 404 if the id doesn’t exist.',
              },
              {
                route: 'DELETE /v1/mailboxes/:id',
                desc: 'Disconnect the mailbox. 204 on success, 404 if not found.',
              },
              {
                route: 'GET /v1/oauth/:provider/authorize?mailboxId=',
                desc: 'Browser redirect to the provider’s consent screen. provider is "google" or "microsoft"; mailboxId must already exist.',
              },
              {
                route: 'GET /v1/oauth/:provider/callback?code=&state=',
                desc: 'Provider calls this back. Public — no bearer token, verified by the signed state param instead.',
              },
            ].map((row) => (
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

      <h3 className="font-display text-lg font-semibold mb-3">POST /v1/mailboxes — body</h3>
      <CodeBlock label="Request body (SMTP/IMAP path)">
        {`{
  "email": "you@yourcompany.com",       // required
  "domainId": "dom_a1b2c3",              // required — create the Domain first
  "provider": "SMTP_CUSTOM",             // optional, defaults to SMTP_CUSTOM
  "dailyCap": 25,                        // optional, defaults to 25
  "smtpHost": "smtp.yourdomain.com",
  "smtpPort": 587,
  "imapHost": "imap.yourdomain.com",
  "imapPort": 993,
  "authUsername": "you@yourcompany.com",
  "authPassword": "YOUR_SMTP_PASSWORD",  // encrypted at rest, never returned
  "senderName": "Sam Patel"              // optional — the From name; up to 80 characters
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        For Google Workspace / Microsoft 365, POST without{' '}
        <code className="font-mono">authPassword</code>, then complete the OAuth flow against the
        returned mailbox&rsquo;s <code className="font-mono">id</code> &mdash; see{' '}
        <Link href="/docs/guides/connecting-mailboxes" className="text-rust font-semibold">
          Connecting mailboxes
        </Link>{' '}
        for the full walkthrough with both connection paths end to end.
      </p>

      <h3 id="sign-in-check" className="font-display text-lg font-semibold mb-3">
        POST /v1/mailboxes — sign-in check
      </h3>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        When the body has an <code className="font-mono">authPassword</code> and an{' '}
        <code className="font-mono">smtpHost</code> or <code className="font-mono">imapHost</code>,
        the engine signs in to each of those servers once, side by side, before anything is saved. A
        wrong password is answered while you&rsquo;re still holding it, not as a failed send hours
        later. Each check gives up after 10 seconds without an answer. The username is{' '}
        <code className="font-mono">authUsername</code>, or <code className="font-mono">email</code>{' '}
        when it&rsquo;s left out. Hosts under the reserved test TLDs{' '}
        <code className="font-mono">.test</code>, <code className="font-mono">.example</code> and{' '}
        <code className="font-mono">.invalid</code> are never dialed.
      </p>
      <div className="card overflow-hidden overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Status</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                status: '201',
                desc: 'Both servers accepted the sign-in (or there was nothing to check). The mailbox is saved.',
              },
              {
                status: '409',
                desc: 'That address is already connected. Answered before any server is dialed, so retrying a create is safe.',
              },
              {
                status: '422',
                desc: 'A server refused the sign-in, or couldn’t be reached. Nothing is saved. When both fail, the SMTP refusal is the one reported.',
              },
            ].map((row) => (
              <tr key={row.status}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">
                  {row.status}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CodeBlock label="Response — 409">{`{ "error": "This mailbox is already connected." }`}</CodeBlock>
      <CodeBlock label="Response — 422 (SMTP password refused)">
        {`{
  "error": "The mail server didn't accept that username and password. Google Workspace and Microsoft 365 usually need an app password here — or use Connect with Google or Connect with Microsoft instead."
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        The <code className="font-mono">error</code> is a sentence written for the person who typed
        the password, so it&rsquo;s safe to show as is. The provider&rsquo;s own reply (for example{' '}
        <code className="font-mono">535 5.7.8</code>) goes to the engine&rsquo;s log, not the
        response. Other 422 sentences you can get:
      </p>
      <ul className="list-disc pl-6 mb-10 max-w-2xl text-[15px] leading-relaxed text-ink-muted space-y-1.5">
        <li>
          <strong className="text-ink">IMAP password refused:</strong> &ldquo;The IMAP server
          didn&rsquo;t accept that username and password, so WarmHawk couldn&rsquo;t read replies.
          Check the IMAP host &mdash; it usually takes the same password as SMTP.&rdquo;
        </li>
        <li>
          <strong className="text-ink">Host doesn&rsquo;t exist:</strong> &ldquo;We couldn&rsquo;t
          find a mail server called smtp.yourdomian.com. Check the SMTP host.&rdquo;
        </li>
        <li>
          <strong className="text-ink">Nothing answers:</strong> &ldquo;We couldn&rsquo;t connect to
          mail.yourdomain.com on port 2525. Check the SMTP host and port &mdash; most mail servers
          use 587 or 465.&rdquo; (For IMAP: &ldquo;&hellip;most mail servers use 993.&rdquo;)
        </li>
        <li>
          <strong className="text-ink">Anything else:</strong> &ldquo;The SMTP server at
          mail.yourdomain.com didn&rsquo;t accept the sign-in. Check the SMTP host, port, username
          and password.&rdquo;
        </li>
      </ul>

      <div className="card p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Continue to{' '}
          <Link href="/docs/api-reference/leads-and-campaigns" className="text-rust font-semibold">
            Leads &amp; campaigns
          </Link>{' '}
          for lead ingest and campaign lifecycle routes, or{' '}
          <Link
            href="/docs/api-reference/queue-domains-and-webhooks"
            className="text-rust font-semibold"
          >
            Queue, domains &amp; webhooks
          </Link>{' '}
          for send throttling and domain health.
        </p>
      </div>
    </div>
  );
}
