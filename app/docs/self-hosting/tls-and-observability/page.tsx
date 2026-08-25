import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'TLS & observability',
  description:
    'How certbot issuance and renewal work (and fail safe, not crash), BYO-cert, plus what ships for observability by default — bundled Uptime Kuma and native OTEL export, both on your own instance.',
  path: '/docs/self-hosting/tls-and-observability',
});

const faqItems = [
  {
    question: 'Does a failed certificate issuance take down the instance?',
    answer:
      'No. If certbot can’t issue a certificate — usually because DNS hasn’t propagated yet — nginx stays up serving plain HTTP instead of crashing the stack. You get a working, reachable instance immediately and TLS once you fix the underlying cause.',
  },
  {
    question: 'Is Uptime Kuma something I have to set up myself?',
    answer:
      'No — it ships bundled and pre-pointed at every service’s health check by default on Tier 1/2, at no extra cost. It runs on the same internal-only network as everything else; reach it through your own reverse-proxy path or SSH tunnel if you want to view it.',
  },
  {
    question: 'Do I need a specific observability backend for OTEL to be useful?',
    answer:
      'No — OTEL export is native and free, but inert until you point OTEL_EXPORTER_OTLP_ENDPOINT at a backend you run or subscribe to (Grafana Tempo, Honeycomb, whatever you already use). WarmHawk doesn’t operate an observability backend for you.',
  },
  {
    question: 'Can I use a certificate I already manage myself instead of certbot?',
    answer:
      'Yes — pass --skip-certbot with --cert-path and --key-path and installation skips the certbot step entirely, configuring nginx with the certificate and key you provide. You own renewal in that mode; the bundled renewal loop only manages certificates it issued itself.',
  },
];

export default function TlsObservabilityPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Self-hosting / TLS &amp; observability</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        TLS that fails safe. Observability that&rsquo;s already on.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Each instance bundles its own certbot &mdash; nothing shared between customers &mdash; and
        ships with real health monitoring and distributed-tracing export already wired in, not
        left as homework.
      </p>
      <AnswerBlock>
        WarmHawk issues its own TLS certificate via certbot at install time and degrades to
        HTTP-only rather than crashing if issuance fails; a renewal loop keeps it current
        automatically. On Tier 1/2, bundled Uptime Kuma watches every service&rsquo;s health check
        by default, and native OTEL export is wired in but inert until you point it at a backend
        you run.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">What happens when cert issuance fails</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <code className="font-mono">install.sh</code> brings nginx up HTTP-only first, then runs{' '}
        <code className="font-mono">certbot certonly --webroot</code> against your domain. If that
        fails &mdash; almost always because DNS doesn&rsquo;t point at this server yet &mdash; the
        installer does not tear anything down. Your instance stays reachable over HTTP, and it
        prints the recovery command instead of exiting with a stack-wide failure:
      </p>
      <CodeBlock label="Retry just the TLS step once DNS resolves">
{`dig +short app.yourcompany.com   # confirm it now points at this server
./scripts/install.sh --retry-tls`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        This re-runs only the certbot request and the nginx reload &mdash; it doesn&rsquo;t
        regenerate secrets, touch your database, or re-prompt for anything you already answered.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">BYO-cert</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Already manage your own certificate (an internal CA, an existing wildcard)? Skip certbot
        entirely at install time:
      </p>
      <CodeBlock label="Install with your own certificate">
{`./scripts/install.sh --domain app.yourcompany.com \\
  --skip-certbot --cert-path /path/to/fullchain.pem --key-path /path/to/privkey.pem`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        In this mode you own renewal too &mdash; the bundled renewal loop only manages
        certificates it issued itself via certbot.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Automatic renewal, and verifying it</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The <code className="font-mono">certbot</code> service runs a renewal loop &mdash;{' '}
        <code className="font-mono">certbot renew</code> every 12 hours &mdash; which only actually
        renews once a certificate is inside its window (Let&rsquo;s Encrypt certs are valid 90
        days). Worth verifying rather than assuming:
      </p>
      <CodeBlock label="Confirm the renewal loop is running, and the cert's real expiry">
{`docker compose ps certbot
echo | openssl s_client -connect app.yourcompany.com:443 -servername app.yourcompany.com 2>/dev/null \\
  | openssl x509 -noout -dates`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Observability: on by default, not homework</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every WarmHawk instance on Tier 1/2 bundles two observability pieces at no extra cost,
        both running on the same internal-only network as everything else:
      </p>
      <ul className="list-disc pl-6 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">Uptime Kuma</strong>, pre-pointed at every service&rsquo;s
          Docker health check the moment the stack comes up &mdash; no manual monitor setup
          required. It has no published port of its own; reach it through your own reverse-proxy
          rule or an SSH tunnel if you want the dashboard.
        </li>
        <li>
          <strong className="text-ink">Native OTEL export</strong> &mdash; both{' '}
          <code className="font-mono">api</code> and <code className="font-mono">worker</code> are
          wired with <code className="font-mono">OTEL_SERVICE_NAME</code> and read{' '}
          <code className="font-mono">OTEL_EXPORTER_OTLP_ENDPOINT</code> from your environment.
          Unset, it&rsquo;s inert &mdash; nothing is exported anywhere, and no third-party
          telemetry backend is bundled or required. Point it at a backend you already run or
          subscribe to (Grafana Tempo, Honeycomb, anything OTLP-compatible) to get real traces:
        </li>
      </ul>
      <CodeBlock label=".env — enable OTEL export">
{`OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector.example.com:4318`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        Neither piece phones home to WarmHawk &mdash; both are entirely yours to view, configure,
        or point elsewhere.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          License activation or a lapsed subscription showing an unrelated error alongside a TLS
          problem? That&rsquo;s a separate system &mdash; see{' '}
          <Link href="/docs/license-activation" className="text-rust font-semibold">
            license activation troubleshooting
          </Link>
          .
        </p>
      </div>

      <FaqSection items={faqItems} title="TLS & observability: questions worth answering up front" />
    </div>
  );
}
