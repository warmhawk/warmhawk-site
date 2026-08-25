import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Guardrails & compliance',
  description:
    'Every compliance and abuse-protection mechanism enforced structurally in WarmHawk’s send pipeline — CAN-SPAM, RFC 8058, EU AI Act disclosure, GDPR erasure, CSV-injection defense, the bounce circuit breaker, and rate limiting.',
  path: '/docs/reference/guardrails-and-compliance',
});

const guardrails: { title: string; body: string }[] = [
  {
    title: 'CAN-SPAM auto-injection',
    body: 'A send is refused before it reaches the pipeline if the instance has no configured physical mailing address, or the campaign has no unsubscribeUrlTemplate — both are unconditional, structural checks in the one shared send path, not per-entry-point duplicated logic a caller could route around.',
  },
  {
    title: 'RFC 8058 one-click unsubscribe',
    body: 'List-Unsubscribe and List-Unsubscribe-Post: List-Unsubscribe=One-Click headers are generated server-side on every send, letting Gmail and Yahoo unsubscribe a recipient with a single POST, no login required — never left to template configuration.',
  },
  {
    title: 'EU AI Act Article 50 disclosure',
    body: 'A disclosure marker is auto-appended whenever a send is genuinely AI-generated AND the recipient resolves to an EU-region signal. A fallback send (AI unavailable, using the plain template) has nothing to disclose, so the marker only appears on real AI-written content.',
  },
  {
    title: 'GDPR erasure',
    body: 'DELETE /v1/leads/erase anonymizes a data subject’s PII across every campaign by email, preserving aggregate counts; DELETE /v1/leads/:id is a real hard delete of one row. Both are structural rights, not admin-only tooling.',
  },
  {
    title: 'CSV-injection defense',
    body: 'A cell value starting with =, +, -, or @ is neutralized on ingest (both CSV import and webhook), before it is ever stored — so a malicious lead field can’t turn into a spreadsheet formula when you later export and open the data in Excel or Sheets.',
  },
  {
    title: 'Bounce/complaint circuit breaker',
    body: 'A campaign/mailbox pair auto-pauses (pausedForBounceRate: true) once its rolling bounce rate exceeds 5%, but only after at least 20 sends — enough to be a real signal, not one unlucky bounce. Catches a bad list before it damages a domain’s reputation, not after.',
  },
  {
    title: 'Login brute-force throttle',
    body: 'POST /v1/auth/login is both rate-limited (10 requests/minute) and per-account locked out after repeated failures — two independent layers, since rate limiting alone doesn’t stop a slow, patient attacker targeting one account.',
  },
  {
    title: 'Continuous blocklist/DNSBL monitoring',
    body: 'Every domain check runs against Spamhaus ZEN/DBL, Barracuda, and SORBS in addition to SPF/DKIM/DMARC — a one-time check at setup doesn’t catch a domain landing on a blocklist days later.',
  },
  {
    title: 'Credential encryption at rest',
    body: 'Mailbox SMTP/IMAP passwords, OAuth refresh tokens, and BYOK AI provider keys are all AES-256-GCM encrypted server-side before persisting, and never echoed back in any API response — not even to the authenticated caller who just set them.',
  },
];

const rateLimits: { route: string; limit: string }[] = [
  { route: 'POST /v1/auth/login', limit: '10 requests / minute' },
  { route: 'POST /v1/leads/import', limit: '10 requests / minute' },
  { route: 'POST /v1/leads/webhook', limit: '30 requests / minute' },
  { route: 'Public domain-check tool', limit: '20 requests / minute' },
  { route: 'Every other route', limit: '100 requests / minute (global default)' },
];

const faqItems = [
  {
    question: 'Are these guardrails enforced by the dashboard, or by the API itself?',
    answer:
      'The API itself, in the one shared send path — the dashboard (Tier 1/2) is a UI on top of the same engine, not a separate enforcement layer. A direct API call gets exactly the same guardrails as a dashboard-triggered send.',
  },
  {
    question: 'Can I raise the bounce circuit breaker’s 5% threshold?',
    answer:
      'Yes — it’s configurable per campaign via bounceRateThreshold on PATCH /v1/campaigns/:id. The 20-send minimum sample size before it can trip at all is not currently configurable.',
  },
  {
    question: 'What happens to a lead’s data if I never call the erasure endpoint?',
    answer:
      'It stays as-is indefinitely — WarmHawk doesn’t auto-expire lead data on any schedule. Erasure (DELETE /v1/leads/erase) is something you call when a data subject makes a request, not a background job.',
  },
  {
    question: 'Where does license/billing security fit into this list?',
    answer:
      'Separately — RSA-signed license issuance and Stripe webhook verification are covered in the checkout/billing docs, not here. This page is specifically about sending-pipeline and data-handling guardrails inside warmhawk-core-engine.',
  },
];

export default function GuardrailsCompliancePage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Reference / Guardrails &amp; compliance</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Enforced structurally, not just documented.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Every guardrail on this page lives in the one shared send/ingest path &mdash; not
        duplicated (and possibly forgotten) per API entry point, and not something a caller can
        route around.
      </p>
      <AnswerBlock>
        WarmHawk enforces CAN-SPAM (address + unsubscribe), RFC 8058 one-click unsubscribe, an EU
        AI Act disclosure marker, GDPR erasure, CSV-injection defense, a bounce/complaint circuit
        breaker (auto-pause past 5% with a 20-send minimum sample), login brute-force throttling,
        continuous blocklist monitoring, and AES-256-GCM credential encryption — all structurally,
        in the API itself, not as optional dashboard settings.
      </AnswerBlock>

      <div className="grid sm:grid-cols-2 gap-5 mb-14">
        {guardrails.map((g) => (
          <div key={g.title} className="card bg-cream p-6">
            <div className="font-semibold text-[15px] mb-2">{g.title}</div>
            <p className="text-[13.5px] leading-relaxed text-ink-muted">{g.body}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-2xl font-semibold mb-4">Rate limits</h2>
      <div className="card overflow-hidden overflow-x-auto mb-10">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Route</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">Limit</th>
            </tr>
          </thead>
          <tbody>
            {rateLimits.map((row) => (
              <tr key={row.route}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{row.route}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{row.limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card bg-cream-elevated p-7 max-w-2xl mb-4">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          The send-pipeline guardrails on this page are all inside{' '}
          <code className="font-mono">warmhawk-core-engine</code>. For the licensing/billing
          security model &mdash; RSA-signed licenses, Stripe webhook verification &mdash; see{' '}
          <Link href="/docs/stripe-webhooks" className="text-rust font-semibold">
            Stripe checkout &amp; webhooks
          </Link>
          . For the per-guardrail request/response detail, see{' '}
          <Link href="/docs/guides/leads-and-enrichment" className="text-rust font-semibold">
            Leads &amp; enrichment
          </Link>{' '}
          and{' '}
          <Link href="/docs/guides/sending-safely-and-domain-health" className="text-rust font-semibold">
            Sending safely &amp; domain health
          </Link>
          .
        </p>
      </div>

      <FaqSection items={faqItems} title="Guardrails & compliance: questions worth answering up front" />
    </div>
  );
}
