import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Architecture',
  description:
    'What actually runs in a WarmHawk instance — every docker compose service, the internal-only network boundary, and how to read logs, tune resource limits, and avoid the ports: concatenation gotcha.',
  path: '/docs/self-hosting/architecture',
});

const services: { name: string; role: string }[] = [
  { name: 'nginx', role: 'The only container that publishes a host port (80/443). TLS termination, reverse proxy to api.' },
  { name: 'api', role: 'Fastify — the /v1 public API, plus internal-only /internal/* routes for n8n callbacks.' },
  { name: 'worker', role: 'BullMQ worker — picks up dispatch jobs from the queue and actually sends.' },
  { name: 'migrate', role: 'Runs Prisma migrations once on startup, then exits — api/worker wait for it to complete successfully.' },
  { name: 'postgres', role: 'Source of truth: leads, campaigns, mailboxes, domains, execution logs, replies.' },
  { name: 'redis', role: 'Backs the BullMQ dispatch queue — AOF-durable, not just a cache. See Backups & Redis durability.' },
  { name: 'n8n', role: 'Runs the dispatch and reply-poll workflows, calling api’s internal-only routes exclusively.' },
  { name: 'uptime-kuma', role: 'Bundled health/uptime monitoring for every service, on by default, free.' },
  { name: 'certbot', role: 'Certificate renewal loop (certbot renew every 12h) — see TLS & observability for the initial-issuance step.' },
];

const faqItems = [
  {
    question: 'Which services are reachable from outside the server?',
    answer:
      'Only nginx, on 80/443. Every other service (api, worker, postgres, redis, n8n, uptime-kuma) sits on an internal-only Docker network with no published host port — a customer’s own server has no shared edge proxy, so this package has to be a fully self-contained, zero-assumption unit.',
  },
  {
    question: 'Why is there both an "api" and a "worker" service?',
    answer:
      'api serves the /v1 HTTP surface; worker is a separate BullMQ consumer process that actually performs sends pulled off the queue. Splitting them means a slow/stuck send never blocks the API from answering a request.',
  },
  {
    question: 'Why is my container listening on a port I did not expect?',
    answer:
      'You are almost certainly running an overlay -f file that maps a port already mapped in the base file. Compose concatenates ports: entries across files rather than overriding them, so both mappings end up bound at once — use the base file’s ${VAR:-default} pattern and override the variable in .env instead of adding a second ports: entry.',
  },
  {
    question: 'What are the cpus/memory limits in the compose file for?',
    answer:
      'They protect the single box the instance runs on from one runaway container (a worker stuck in a retry loop, for example) starving everything else — not multi-tenant isolation, since every install is already single-tenant by design.',
  },
];

export default function ArchitecturePage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Self-hosting / Architecture</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Nine containers, one published port.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        A WarmHawk instance is a self-contained docker compose stack on your own server &mdash;
        every service except nginx sits on an internal-only Docker network, with zero assumptions
        about shared infrastructure on the host.
      </p>
      <AnswerBlock>
        A WarmHawk instance runs nine docker compose services: nginx (the only one with a
        published port), the api and worker (Fastify + BullMQ, split so a slow send never blocks
        the API), postgres and redis (source of truth and the durable send queue), migrate
        (runs once), n8n (dispatch/reply-poll workflows), uptime-kuma (bundled monitoring), and
        certbot (renewal loop). Nothing but nginx is reachable from outside your server.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Every service, what it does</h2>
      <div className="card overflow-hidden overflow-x-auto mb-10">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Service</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">Role</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.name}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">{service.name}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">{service.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Only <code className="font-mono">nginx</code> publishes host ports (<code className="font-mono">80</code>/
        <code className="font-mono">443</code>). Every other service sits on an <code className="font-mono">internal</code>-only
        Docker network with no published port at all &mdash; there is no nginx location block for{' '}
        <code className="font-mono">/internal/*</code> either, so those routes are unreachable from
        outside the box even if you tried.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Reading logs when something won&rsquo;t come up</h2>
      <CodeBlock label="See every service's current state">
{`docker compose ps`}
      </CodeBlock>
      <CodeBlock label="Tail or follow logs for the failing service">
{`docker compose logs --tail=200 api
docker compose logs -f worker`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        A container in a restart loop: follow logs live rather than tailing once &mdash; you&rsquo;ll
        catch the actual error right before each restart, not just the generic exit message.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">The ports: concatenation gotcha</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Docker Compose merges multiple <code className="font-mono">-f</code> files together, and
        for the <code className="font-mono">ports:</code> key specifically, that merge is a{' '}
        <strong className="text-ink">concatenation, not an override</strong>. Map a port for{' '}
        <code className="font-mono">nginx</code> in an overlay file and you don&rsquo;t replace the
        base file&rsquo;s mapping &mdash; you get both, bound at once.
      </p>
      <CodeBlock label="Wrong — adds a second binding, doesn't replace one">
{`# docker-compose.override.yml
nginx:
  ports:
    - "8443:443"`}
      </CodeBlock>
      <CodeBlock label="Correct — override the variable, not the ports: block">
{`# .env
HTTPS_PORT=8443`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Already stuck with duplicate bindings? <code className="font-mono">docker compose config</code> prints
        the fully-merged effective config so you can see exactly what&rsquo;s bound before
        debugging further.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Resource limits</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every service carries <code className="font-mono">cpus</code>/<code className="font-mono">memory</code> limits
        (and reservations) sized for a modest single box &mdash; e.g. <code className="font-mono">api</code>: 1.0
        CPU / 512M, <code className="font-mono">worker</code>: 0.5 CPU / 256M,{' '}
        <code className="font-mono">postgres</code>: 1.0 CPU / 768M. They exist to stop one runaway
        container from starving everything else on your box; it is not a multi-tenant isolation
        mechanism, since every install is already single-tenant. Running high volume on a larger
        box: raise these (don&rsquo;t remove them) in your own overlay targeting just the{' '}
        <code className="font-mono">deploy.resources</code> block, which merges safely since it
        isn&rsquo;t subject to the <code className="font-mono">ports:</code> concatenation
        behavior above.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Checking container health</h2>
      <CodeBlock label="Health status at a glance">
{`docker compose ps
# NAME                STATUS
# warmhawk-nginx      Up 2 hours
# warmhawk-api        Up 2 hours (healthy)
# warmhawk-worker     Up 2 hours (healthy)
# warmhawk-postgres   Up 2 hours (healthy)
# warmhawk-redis      Up 2 hours (healthy)`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-14">
        A service stuck at <code className="font-mono">(unhealthy)</code> rather than
        crash-looping is usually still running but failing its own internal check &mdash; check
        that service&rsquo;s logs specifically, since the process itself hasn&rsquo;t necessarily
        exited. For the bundled uptime/alerting layer watching these same health checks
        continuously, see{' '}
        <Link href="/docs/self-hosting/tls-and-observability" className="text-rust font-semibold">
          TLS &amp; observability
        </Link>
        .
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          A fresh install or an update failing partway through has its own dedicated walkthroughs:{' '}
          <Link href="/docs/install-troubleshooting" className="text-rust font-semibold">
            install.sh troubleshooting
          </Link>{' '}
          and{' '}
          <Link href="/docs/update-failures" className="text-rust font-semibold">
            warmhawk update failures
          </Link>
          .
        </p>
      </div>

      <FaqSection items={faqItems} title="Architecture: questions worth answering up front" />
    </div>
  );
}
