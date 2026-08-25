import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Backups & Redis durability',
  description:
    'How WarmHawk’s nightly Postgres backups and restore procedure work, plus why Redis is configured for AOF durability — because the dispatch queue holding your leads is data loss risk, not just a cache.',
  path: '/docs/self-hosting/backups-and-redis-durability',
});

const faqItems = [
  {
    question: 'Does WarmHawk ever receive or store a copy of my backups?',
    answer:
      'No. Backups are written entirely to your own configured destination — a local path by default, or your own rclone-driven remote (your own S3/B2 bucket) if you set one up. WarmHawk never receives or stores a customer’s backup on any WarmHawk-operated infrastructure.',
  },
  {
    question: 'Why does Redis durability matter if Postgres is the real database?',
    answer:
      'Redis backs the BullMQ dispatch queue itself, not just a cache — losing unflushed writes on a crash or restart means a lead silently never gets emailed, with nothing else in the system surfacing an error. That is why it runs AOF (append-only file), not the eviction-friendly defaults.',
  },
  {
    question: 'Should I actually test a restore before I need one?',
    answer:
      'Yes, and not optionally. Run the restore steps below against a spare box or a disposable instance at least once so you know the exact commands work, before an actual incident forces you to learn them under pressure.',
  },
  {
    question: 'What happens to in-flight queue jobs if Redis crashes anyway?',
    answer:
      'A crash-recovery reconciliation job cross-checks ExecutionLog rows against the queue on restart and re-enqueues anything that looks lost — a second line of defense behind AOF durability, not a replacement for it.',
  },
];

export default function BackupsRedisDurabilityPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Self-hosting / Backups &amp; Redis durability</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        A backup you&rsquo;ve never restored is a guess, not a plan.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Two independent durability stories: Postgres backs up nightly to infrastructure you
        control, and Redis &mdash; which holds the live send queue, not just a cache &mdash; is
        configured for crash-safe durability by default.
      </p>
      <AnswerBlock>
        WarmHawk backs up Postgres nightly (pg_dump, gzip, your own local path or rclone remote —
        never WarmHawk&rsquo;s infrastructure) with a full restore procedure below, and runs Redis
        with AOF durability (appendfsync everysec, noeviction) because Redis backs the real BullMQ
        send queue — losing unflushed writes there means a lead silently never gets emailed.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">How nightly Postgres backups work</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <code className="font-mono">scripts/backup-postgres.sh</code> runs on a nightly schedule
        inside your instance: <code className="font-mono">pg_dump</code>, piped through{' '}
        <code className="font-mono">gzip</code>, written to a destination you configured &mdash; a
        local path by default, or your own <code className="font-mono">rclone</code> remote (your
        own S3/B2 bucket) if you set one up during install. Enabled via a one-time install prompt
        (default yes), 14-day retention by default, configurable directly in the script.
      </p>
      <CodeBlock label="Run a backup right now, before a risky change">
{`docker compose exec api /app/scripts/backup-postgres.sh
ls -lh /var/backups/warmhawk/`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Restoring from a backup</h2>
      <ol className="list-decimal pl-6 space-y-4 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">Stop the services that write to Postgres.</strong>
          <CodeBlock label="Stop dependent services">
{`docker compose stop api worker`}
          </CodeBlock>
        </li>
        <li>
          <strong className="text-ink">Restore the gzipped dump.</strong>
          <CodeBlock label="Restore from a gzipped dump">
{`gunzip -c /var/backups/warmhawk/warmhawk-2026-08-20.sql.gz \\
  | docker compose exec -T postgres psql -U warmhawk -d warmhawk`}
          </CodeBlock>
          Restoring onto a database with existing (possibly corrupted) data: drop and recreate it
          first so the restore starts clean.
        </li>
        <li>
          <strong className="text-ink">Restart the API and worker.</strong>
          <CodeBlock label="Bring services back up">
{`docker compose start api worker`}
          </CodeBlock>
        </li>
        <li>
          <strong className="text-ink">Verify it actually worked.</strong>
          <CodeBlock label="Verify health, then spot-check data">
{`docker compose ps
docker compose exec postgres psql -U warmhawk -d warmhawk -c "SELECT count(*) FROM leads;"`}
          </CodeBlock>
        </li>
      </ol>

      <h2 className="font-display text-2xl font-semibold mb-4">Redis durability: why it isn&rsquo;t just a cache</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Redis backs the BullMQ dispatch queue &mdash; mailbox rotation, cadence/jitter scheduling,
        every job waiting to send. Losing unflushed writes on a crash or restart means a lead
        silently never gets emailed, with no error surfaced anywhere else in the system. That&rsquo;s
        why the bundled <code className="font-mono">ops/redis.conf</code> configures real
        durability instead of Redis&rsquo;s cache-friendly defaults:
      </p>
      <CodeBlock label="ops/redis.conf — the durability-relevant lines">
{`appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes

save 900 1
save 300 10
save 60 10000

maxmemory-policy noeviction`}
      </CodeBlock>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">AOF, fsync every second</strong> &mdash; every write is
          logged to an append-only file, flushed at most once a second, so a crash loses at most a
          second of writes instead of everything since the last RDB snapshot.
        </li>
        <li>
          <strong className="text-ink">RDB snapshots as a second safety net</strong>, layered on
          top of AOF, not instead of it.
        </li>
        <li>
          <strong className="text-ink"><code className="font-mono">noeviction</code></strong> &mdash;
          Redis refuses new writes rather than silently evicting queue data under memory pressure.
          A refused write is loud and recoverable; a silently evicted job is neither.
        </li>
        <li>
          <strong className="text-ink">A crash-recovery reconciliation cron</strong> cross-checks{' '}
          <code className="font-mono">ExecutionLog</code> rows against what BullMQ actually has
          queued on every restart, and re-enqueues anything that looks lost &mdash; a second line
          of defense behind AOF, not a substitute for it.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Redis&rsquo;s password (<code className="font-mono">REDIS_PASSWORD</code>) is passed via{' '}
        <code className="font-mono">--requirepass</code> on the command line rather than written
        into the conf file, so it never ends up committed anywhere &mdash; generated once by{' '}
        <code className="font-mono">install.sh</code> and stored only in your own{' '}
        <code className="font-mono">.env</code>.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl mb-10">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          A backup you&rsquo;ve never restored is a guess, not a plan. Run the restore procedure
          above once against a spare box or a disposable instance &mdash; not production &mdash; so
          you know firsthand it works before an actual incident makes that the first time
          you&rsquo;ve tried it.
        </p>
      </div>

      <p className="text-sm text-ink-muted max-w-2xl">
        Rolling back a bad update rather than a data problem? See{' '}
        <Link href="/docs/update-failures" className="text-rust font-semibold">
          warmhawk update failures
        </Link>{' '}
        &mdash; a rollback to the previous image tag may be all you need, without touching the
        database at all.
      </p>

      <FaqSection items={faqItems} title="Backups & Redis durability: questions worth answering up front" />
    </div>
  );
}
