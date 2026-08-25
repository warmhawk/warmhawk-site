import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'install.sh troubleshooting',
  description:
    'Fixes for the most common WarmHawk install.sh failures: missing Docker/Compose, ports 80/443 already bound, DNS not propagated yet, and how to safely re-run the installer.',
  path: '/docs/install-troubleshooting',
});

const faqItems = [
  {
    question: 'Is it safe to just run install.sh again after a failure?',
    answer:
      'Yes. install.sh is idempotent — it checks what already exists (containers, secrets in .env, TLS certs) before touching anything, so re-running it after a failed step won&rsquo;t duplicate secrets or double-provision a certificate.',
  },
  {
    question: 'Where do I actually see why install.sh failed?',
    answer:
      'install.sh prints each preflight check and stage to your terminal as it runs. Scroll up to the first line containing "FAILED" or a non-zero exit — that&rsquo;s almost always the root cause, not the last line printed.',
  },
  {
    question: 'What if DNS hasn&rsquo;t propagated yet but I want to keep going?',
    answer:
      'Let the install finish — a certbot failure degrades to HTTP-only mode rather than crashing the whole stack. Once DNS resolves, run install.sh --retry-tls to pick up TLS without re-running the entire install.',
  },
  {
    question: 'Do I need to re-enter my secrets on a re-run?',
    answer:
      'No. install.sh detects an existing .env and reuses the secrets it already generated there instead of prompting again. (This is the free, self-hosted engine installer — it has no license concept at all. If you&rsquo;re setting up the licensed operator dashboard separately, see that repo&rsquo;s own install.sh, which does handle a license.)',
  },
];

export default function InstallTroubleshootingPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Install troubleshooting</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        When install.sh doesn&rsquo;t finish clean.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        <code className="font-mono text-base">install.sh</code> preflight-checks Docker, ports, and
        DNS before it touches your server, and it&rsquo;s safe to re-run at any point. Almost every
        failure we see falls into one of the three buckets below.
      </p>
      <AnswerBlock>
        This page covers the three most common install.sh failures — missing Docker/Compose, ports
        80/443 already in use, and DNS that hasn&rsquo;t propagated — with the exact commands to
        diagnose and fix each one, plus how to read the install log and re-run the installer safely
        without losing your secrets or license.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Docker or Docker Compose not installed</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        install.sh checks for both <code className="font-mono">docker</code> and the Compose plugin
        as its very first preflight step. If either is missing, it stops immediately with a clear
        message rather than partially provisioning anything — it will not attempt to install Docker
        for you.
      </p>
      <CodeBlock label="Check what's actually present">
{`docker --version
docker compose version`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        If either command errors out, install Docker Engine and the Compose plugin for your
        distribution first (Docker&rsquo;s own convenience script,{' '}
        <code className="font-mono">curl -fsSL https://get.docker.com | sh</code>, covers most
        Ubuntu/Debian boxes), then re-run the WarmHawk install command.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Port 80 or 443 already bound</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        WarmHawk&rsquo;s bundled nginx is the only container that publishes 80/443 — everything else
        stays on an internal-only Docker network. If another process (a previous nginx, Apache, or a
        different app) already owns those ports, the compose stack will fail to start. Check first:
      </p>
      <CodeBlock label="Find what's listening on 443 (Linux)">
{`sudo lsof -i :443
sudo lsof -i :80`}
      </CodeBlock>
      <CodeBlock label="No lsof? use netstat or ss">
{`sudo netstat -tulpn | grep -E ':80|:443'
sudo ss -tulpn | grep -E ':80|:443'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Stop or reconfigure whatever&rsquo;s bound to those ports (<code className="font-mono">sudo systemctl stop nginx</code> is
        the usual culprit on a box that had a prior web server), confirm both ports are free, then
        re-run install.sh. It&rsquo;s idempotent, so it will pick up where it left off rather than
        starting over.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">DNS hasn&rsquo;t propagated yet</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Certbot needs your domain to resolve to this server before it can issue a certificate. If
        you just pointed DNS at this box, propagation can take anywhere from a few minutes to a few
        hours depending on your registrar and TTL. Check whether it&rsquo;s resolved yet:
      </p>
      <CodeBlock label="Check DNS resolution">
{`dig +short app.yourcompany.com`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        That should print this server&rsquo;s public IP. If it prints nothing, or a different IP,
        DNS isn&rsquo;t ready yet. This is expected and install.sh handles it gracefully: nginx comes
        up HTTP-only, the certbot step degrades instead of crashing the stack, and your dashboard
        will be reachable over plain HTTP in the meantime. Once <code className="font-mono">dig</code> shows
        the right IP, recover TLS with:
      </p>
      <CodeBlock label="Retry TLS once DNS is ready">
{`sudo ./install.sh --retry-tls`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        See{' '}
        <Link href="/docs/self-hosting/tls-and-observability" className="text-rust font-semibold">
          TLS &amp; observability
        </Link>{' '}
        for what to do if <code className="font-mono">--retry-tls</code> itself fails.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Re-running install.sh safely</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        install.sh is built to be re-run. It won&rsquo;t regenerate secrets that already exist in{' '}
        <code className="font-mono">.env</code>, won&rsquo;t re-request a certificate that&rsquo;s
        already valid, and won&rsquo;t re-prompt for backups or an alert webhook if you already
        answered those prompts. Just run the same command again:
      </p>
      <CodeBlock label="Re-run install">
{`curl -fsSL https://warmhawk.com/install | bash -s -- --domain app.yourcompany.com`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Reading the install log</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        install.sh streams every preflight check, secret generation step, and container startup
        directly to your terminal. If you need to review it after the fact, redirect it to a file on
        your next run, or check the containers it already started:
      </p>
      <CodeBlock label="Tee the install output to a file">
{`curl -fsSL https://warmhawk.com/install | bash -s -- --domain app.yourcompany.com 2>&1 | tee install.log`}
      </CodeBlock>
      <CodeBlock label="Check which containers actually started">
{`docker compose ps
docker compose logs --tail=100 nginx`}
      </CodeBlock>

      <FaqSection items={faqItems} title="install.sh: questions worth answering up front" />
    </div>
  );
}
