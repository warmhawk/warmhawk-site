import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'warmhawk update failures',
  description:
    'What warmhawk update actually does, how to check a failed migration without panic-restarting, how to roll back to the previous image tag after a bad update, and where to check the CHANGELOG first.',
  path: '/docs/update-failures',
});

const faqItems = [
  {
    question: 'Do I need to re-enter my secrets or license when running warmhawk update?',
    answer:
      'No. warmhawk update reuses everything already persisted in your .env from the original install — no secrets, no license, no prompts. It just pulls, migrates, and restarts.',
  },
  {
    question: 'My migration seems stuck — should I restart the stack?',
    answer:
      'Not immediately. Repeatedly restarting mid-migration is the single most common cause of a genuinely corrupted schema. Check docker compose logs migrate first and give it a real chance to either finish or fail cleanly before touching anything else.',
  },
  {
    question: 'How do I undo an update that broke something?',
    answer:
      'Roll back to the previous image tag explicitly with docker compose pull (pinned to the old tag) and docker compose up -d — this is fast and doesn&rsquo;t touch your database, unlike a full restore.',
  },
  {
    question: 'Where do I check what actually changed before I update a production instance?',
    answer:
      'The relevant package&rsquo;s CHANGELOG.md on GitHub — warmhawk-core-engine and warmhawk-enterprise-operator each maintain their own. Read the entries between your current version and the new one before updating anything customer-facing.',
  },
];

export default function UpdateFailuresPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / warmhawk update failures</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        When warmhawk update doesn&rsquo;t go clean.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        <code className="font-mono text-base">warmhawk update</code> is meant to be boring: pull,
        migrate, restart, done. When it isn&rsquo;t, the fix is almost always to slow down rather
        than restart repeatedly.
      </p>
      <AnswerBlock>
        This page covers what warmhawk update actually does (pull the latest tag, run pending
        migrations, rolling restart), what to check if a migration fails partway through instead of
        panic-restarting, how to roll back to the previous image tag if an update introduces a
        regression, and where to read the CHANGELOG before updating anything in production.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">What warmhawk update does</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        It&rsquo;s a thin wrapper script around four steps, run in order:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        <li>Pulls the latest image for your configured tag/channel</li>
        <li>Runs any pending database migrations</li>
        <li>Performs a rolling <code className="font-mono">docker compose up -d</code> restart</li>
        <li>Reuses your existing secrets and license from <code className="font-mono">.env</code> &mdash; no re-entry, no re-activation</li>
      </ol>
      <CodeBlock label="Run an update">
{`warmhawk update`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        No manual steps are expected on your end beyond running the command &mdash; if you see
        prompts you don&rsquo;t recognize, or the update hangs somewhere unexpected, that&rsquo;s
        worth investigating rather than dismissing.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">A migration fails partway through</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Don&rsquo;t panic-restart the stack repeatedly &mdash; that&rsquo;s the fastest way to turn a
        recoverable failed migration into a genuinely inconsistent schema. Instead, check exactly
        what the migration step logged:
      </p>
      <CodeBlock label="Check migration logs specifically">
{`docker compose logs migrate`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Most migration failures are one of two shapes: a transient connection issue (Postgres wasn&rsquo;t
        fully up yet when the migration ran &mdash; re-running the update usually clears this), or
        an actual schema conflict (rare, and usually means a manual change was made to the database
        outside of WarmHawk&rsquo;s own migrations at some point). If the logs show a real schema
        error rather than a connection timeout, stop and take a backup before doing anything else:
      </p>
      <CodeBlock label="Take a backup before touching a failed migration further">
{`docker compose exec api /app/scripts/backup-postgres.sh`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Then email{' '}
        <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
          support@warmhawk.com
        </a>{' '}
        with the exact migration log output &mdash; a genuine schema conflict is rare enough that
        it&rsquo;s worth a second set of eyes before you act on it yourself.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Rolling back a bad update</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        If the update completed but introduced a regression &mdash; something that worked yesterday
        is broken today &mdash; roll back to the previous image tag explicitly rather than trying to
        patch forward under pressure:
      </p>
      <CodeBlock label="Pin back to the previous tag and restart">
{`# Edit .env: set the image tag back to the previous known-good version, e.g.
# WARMHAWK_IMAGE_TAG=v2.4.1

docker compose pull
docker compose up -d`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        This rolls back the application code without touching your database. If the update also ran
        a migration that the old code isn&rsquo;t compatible with, you may need a full data restore
        instead &mdash; see{' '}
        <Link href="/docs/self-hosting/backups-and-redis-durability" className="text-rust font-semibold">
          backups &amp; Redis durability
        </Link>{' '}
        for that procedure. This is exactly why taking a manual backup right before updating a
        production instance is worth the extra minute.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Check the CHANGELOG before you update production</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Before running <code className="font-mono">warmhawk update</code> against a production
        instance, read what actually changed between your current version and the new one. Each
        package maintains its own <code className="font-mono">CHANGELOG.md</code>, linked from{' '}
        <Link href="/docs/reference/faq-and-changelog" className="text-rust font-semibold">
          the changelog
        </Link>
        , covering breaking changes, new required environment variables, and migration notes worth
        knowing about ahead of time rather than discovering mid-update.
      </p>

      <FaqSection items={faqItems} title="warmhawk update: questions worth answering up front" />
    </div>
  );
}
