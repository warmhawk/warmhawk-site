import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, howToSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata: Metadata = pageSeo({
  title: 'Quickstart & installation',
  description:
    'Install WarmHawk and send a real test campaign in a handful of curl calls: authenticate, add a domain, connect a mailbox, create a campaign, import a lead, launch, and check the queue — against the real /v1 API.',
  path: '/docs/quickstart',
});

// Mirrors the seven numbered sections below exactly — see lib/seo.ts's
// howToSchema() header comment for why this page carries it.
const quickstartSteps = [
  {
    name: 'Install the stack',
    text: 'Run curl -fsSL https://warmhawk.com/install | bash -s -- --domain yourcompany.com on a fresh server with the domain already pointed at it.',
  },
  {
    name: 'Authenticate',
    text: 'POST /v1/auth/login with the email and password install.sh printed at the end of setup to get a bearer token.',
  },
  {
    name: 'Add a sending domain',
    text: 'POST /v1/domains with the domainName — a mailbox belongs to a domain, so create the domain first.',
  },
  {
    name: 'Connect a mailbox',
    text: 'POST /v1/mailboxes with SMTP/IMAP credentials, or create the mailbox first and run the Google/Microsoft OAuth consent flow.',
  },
  {
    name: 'Create a campaign',
    text: 'POST /v1/campaigns with a template, an optional aiPromptTemplate for BYOK AI personalization, and an unsubscribeUrlTemplate.',
  },
  {
    name: 'Import a lead',
    text: 'POST /v1/leads with the campaignId and the lead’s email, name, and any customFields your personalization needs.',
  },
  {
    name: 'Launch, then check the queue',
    text: 'POST /v1/campaigns/:id/launch to enqueue the send, then GET /v1/queue/status to confirm the job moved from waiting/delayed to completed.',
  },
];

export default function QuickstartPage() {
  return (
    <div className="py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToSchema('Install and send with WarmHawk', quickstartSteps)),
        }}
      />
      <div className="label text-rust mb-5">Docs / Get started / Quickstart &amp; installation</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Install it, then send a real email in six calls.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        The open-core package (<code className="font-mono text-base">warmhawk-core-engine</code>) is
        a complete API with no web UI attached &mdash; that&rsquo;s the point of Tier 0. Run{' '}
        <code className="font-mono text-base">install.sh</code> once, then everything below runs
        against your own instance with nothing but <code className="font-mono text-base">curl</code>
        .
      </p>
      <AnswerBlock>
        This page gets you from a fresh WarmHawk install to a real sent email: install the stack,
        authenticate, register a sending domain, connect a mailbox, create a campaign, import a
        lead, launch, and check the queue. It&rsquo;s the fastest way to confirm your instance works
        end-to-end before building anything on top of the API.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">0. Install the stack</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        On a fresh server with a domain already pointed at it, run the installer. It
        preflight-checks Docker/Compose, ports 80/443, and DNS before touching anything, and
        it&rsquo;s safe to re-run at any point:
      </p>
      <CodeBlock label="Install WarmHawk — Tier 0 (free, API-only)">
        {`curl -fsSL https://warmhawk.com/install | bash -s -- --domain yourcompany.com`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Pass your <strong>bare company domain</strong>, not a subdomain — the installer derives{' '}
        <code className="font-mono">api.yourcompany.com</code> for the engine (and{' '}
        <code className="font-mono">dashboard.yourcompany.com</code> for the operator dashboard, if
        you install it). Both need to resolve to this server before you run it.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Bought Tier 1 or Tier 2? Use the licensed form instead — same command, plus the token from
        your purchase email. It installs the engine <em>and</em> the operator dashboard in one pass:
      </p>
      <CodeBlock label="Install WarmHawk — Tier 1/2 (adds the operator dashboard)">
        {`curl -fsSL https://warmhawk.com/install | bash -s -- \\
  --license <token-from-your-purchase-email> \\
  --domain yourcompany.com \\
  --owner-email you@yourcompany.com`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Ran into a failure? See{' '}
        <Link href="/docs/install-troubleshooting" className="text-rust font-semibold">
          install.sh troubleshooting
        </Link>{' '}
        for the three most common causes (missing Docker, a bound port, DNS not propagated yet)
        before continuing below. Every call from here on uses{' '}
        <code className="font-mono">YOUR_API_KEY</code> and{' '}
        <code className="font-mono">api.yourcompany.com</code> as placeholders for the token you get
        from step 1 and the API host the installer created.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">1. Authenticate</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every endpoint below except this one requires a bearer token. Log in against the
        engine&rsquo;s own user table (the account <code className="font-mono">install.sh</code>{' '}
        printed at the end of setup) to get one:
      </p>
      <CodeBlock label="POST /v1/auth/login">
        {`curl -X POST https://api.yourcompany.com/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "you@yourcompany.com", "password": "YOUR_PASSWORD" }'`}
      </CodeBlock>
      <CodeBlock label="Response">{`{ "token": "YOUR_API_KEY" }`}</CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">2. Add a sending domain</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A mailbox belongs to a domain, so create the domain first:
      </p>
      <CodeBlock label="POST /v1/domains">
        {`curl -X POST https://api.yourcompany.com/v1/domains \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "domainName": "yourcompany.com" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Returns a <code className="font-mono">Domain</code> row with an{' '}
        <code className="font-mono">id</code> &mdash; you&rsquo;ll pass that as{' '}
        <code className="font-mono">domainId</code> in the next step.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">3. Connect a mailbox</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A mailbox is one sending identity WarmHawk will send from. For a plain SMTP/IMAP inbox,
        register it directly:
      </p>
      <CodeBlock label="POST /v1/mailboxes">
        {`curl -X POST https://api.yourcompany.com/v1/mailboxes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@yourcompany.com",
    "domainId": "dom_a1b2c3",
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
        Google Workspace or Microsoft 365 instead? Create the mailbox first (no{' '}
        <code className="font-mono">authPassword</code> needed), then send the browser to{' '}
        <code className="font-mono">GET /v1/oauth/google/authorize?mailboxId=&lt;id&gt;</code> (or{' '}
        <code className="font-mono">microsoft</code>) to run the OAuth consent flow &mdash; see{' '}
        <Link href="/docs/guides/connecting-mailboxes" className="text-rust font-semibold">
          Connecting mailboxes
        </Link>{' '}
        for the full walkthrough. Either way, the response returns a real{' '}
        <code className="font-mono">Mailbox</code> row (never the credential itself) with the{' '}
        <code className="font-mono">id</code> you&rsquo;ll reference below.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">4. Create a campaign</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A campaign has two content fields that do different jobs:{' '}
        <code className="font-mono">template</code> is the plain-text body sent as-is (or used as a
        fallback if AI personalization is off or fails) &mdash; it supports native spintax{' '}
        <code className="font-mono">{'{option one|option two}'}</code> variation.{' '}
        <code className="font-mono">aiPromptTemplate</code> is the instruction handed to your BYOK
        Gemini/Claude key, which then writes the actual send &mdash; it supports flat{' '}
        <code className="font-mono">{'{{fieldName}}'}</code> placeholders resolved from the
        lead&rsquo;s <code className="font-mono">firstName</code>/
        <code className="font-mono">lastName</code>/<code className="font-mono">company</code> and
        any <code className="font-mono">customFields</code> key (flat, so a custom field named{' '}
        <code className="font-mono">recentNews</code> is{' '}
        <code className="font-mono">{'{{recentNews}}'}</code>, never{' '}
        <code className="font-mono">{'{{customFields.recentNews}}'}</code>). A campaign also needs
        an <code className="font-mono">unsubscribeUrlTemplate</code> before it can launch (CAN-SPAM)
        &mdash; set it now to avoid a 422 later:
      </p>
      <CodeBlock label="POST /v1/campaigns">
        {`curl -X POST https://api.yourcompany.com/v1/campaigns \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Quickstart test send",
    "template": "Hi there — {quick question|one question} for you today, if you have a minute?",
    "aiPromptTemplate": "Write a 2-sentence, specific opener to {{firstName}} at {{company}}, referencing that they {{recentNews}}. No generic filler.",
    "unsubscribeUrlTemplate": "https://yourcompany.com/unsubscribe?email={{email}}"
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        The response echoes the created campaign plus a{' '}
        <code className="font-mono">contentQuality</code> block (spam-word score, spintax group
        count) computed on every save &mdash; a 422 here means the{' '}
        <code className="font-mono">template</code>&rsquo;s spintax groups are unbalanced, not that
        the content was rejected for tone. See{' '}
        <Link
          href="/docs/guides/campaigns-ai-and-content-quality"
          className="text-rust font-semibold"
        >
          Campaigns, AI &amp; content quality
        </Link>{' '}
        for the full field reference.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">5. Import a lead</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Leads carry whatever fields your personalization needs via an open{' '}
        <code className="font-mono">customFields</code> object:
      </p>
      <CodeBlock label="POST /v1/leads">
        {`curl -X POST https://api.yourcompany.com/v1/leads \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "camp_g7h8i9",
    "email": "jane@prospect-co.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "company": "Prospect Co",
    "customFields": {
      "jobTitle": "VP Marketing",
      "recentNews": "closed a $12M Series A"
    }
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Importing a real list instead of one test lead? See{' '}
        <Link href="/docs/guides/leads-and-enrichment" className="text-rust font-semibold">
          Leads &amp; enrichment
        </Link>{' '}
        for CSV bulk import, webhook ingest, and the Clay/Apollo enrichment recipe.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">6. Launch, then check the queue</h2>
      <CodeBlock label="POST /v1/campaigns/:id/launch">
        {`curl -X POST https://api.yourcompany.com/v1/campaigns/camp_g7h8i9/launch \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Launching enqueues the send &mdash; it doesn&rsquo;t fire instantly. WarmHawk&rsquo;s queue
        is jittered and capacity-aware on purpose (an 8-minute cadence floor plus jitter), even for
        a single test send, so the timing you see here matches production behavior. Poll the queue
        to confirm it moved:
      </p>
      <CodeBlock label="GET /v1/queue/status">
        {`curl https://api.yourcompany.com/v1/queue/status \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="Example response">
        {`{
  "counts": { "waiting": 0, "active": 0, "delayed": 0, "completed": 1, "failed": 0 },
  "isPaused": false,
  "jobs": [],
  "throttling": { "cadenceFloorSeconds": 480, "jitterSeconds": 240 }
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        A job that moves from <code className="font-mono">waiting</code>/
        <code className="font-mono">delayed</code> to <code className="font-mono">completed</code>{' '}
        means the whole path worked: mailbox credentials, queue, and outbound delivery through your
        own nginx. See{' '}
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>{' '}
        for what the throttling numbers mean and how the bounce circuit breaker protects a domain.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl mb-10">
        <h2 className="font-display text-xl font-semibold mb-3">
          If something doesn&rsquo;t come up clean
        </h2>
        <ul className="space-y-2 text-[15px] text-ink-muted">
          <li>
            <Link href="/docs/install-troubleshooting" className="text-rust font-semibold">
              install.sh troubleshooting
            </Link>{' '}
            &mdash; Docker/Compose missing, ports already bound, DNS not propagated yet.
          </li>
          <li>
            <Link href="/docs/update-failures" className="text-rust font-semibold">
              warmhawk update failures
            </Link>{' '}
            &mdash; what to do if updating an existing instance doesn&rsquo;t go clean.
          </li>
        </ul>
      </div>

      <div className="card p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Every endpoint above matches the real, current <code className="font-mono">/v1</code> API
          shape &mdash; see the{' '}
          <Link href="/docs/api-reference/auth-and-mailboxes" className="text-rust font-semibold">
            API reference
          </Link>{' '}
          for the complete, field-by-field documentation of every route.
        </p>
      </div>
    </div>
  );
}
