import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CodeBlock } from '@/components/CodeBlock';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

const compareRows: CompareRow[] = [
  {
    label: 'Queue durability',
    them: 'You build and maintain crash-recovery yourself',
    us: 'AOF-persisted Redis queue with a reconciliation cron, built in',
  },
  {
    label: 'Send cadence',
    them: 'You write your own throttling logic',
    us: '8-min cadence floor + jitter, enforced by the engine',
  },
  {
    label: 'Mailbox rotation',
    them: 'Manual node logic, easy to get wrong',
    us: 'Capacity-aware, least-recently-used rotation, built in',
  },
  {
    label: 'Guardrails',
    them: 'CAN-SPAM, List-Unsubscribe headers, suppression — all on you',
    us: 'CAN-SPAM, RFC 8058 List-Unsubscribe headers, and a bounce circuit breaker — enforced in the shared send pipeline on every send',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs a Custom n8n Cold Email Workflow — Dedicated BullMQ vs DIY',
  description:
    'A technical comparison of WarmHawk’s dedicated BullMQ queueing engine against a hand-rolled n8n cold-email workflow: rotation, jitter, crash recovery, and bounded queue growth.',
  path: '/vs/custom-n8n',
});

const faqItems = [
  {
    question: 'Can I still use n8n alongside WarmHawk?',
    answer:
      'Yes. Many teams keep n8n for CRM syncs, lead enrichment, or Slack notifications, and point WarmHawk’s webhooks at those workflows. WarmHawk replaces the sending queue, not your whole automation stack.',
  },
  {
    question: 'Why not just build this in n8n myself?',
    answer:
      'You can, and some teams do — but rotation, jitter, and crash recovery all become custom Function-node logic you own and maintain. WarmHawk ships that logic already built, tested, and running.',
  },
  {
    question: 'What happens if Redis crashes mid-send?',
    answer:
      'AOF persistence means Redis replays queued jobs on restart, and a reconciliation cron re-enqueues any send whose status implies it should be queued but has no matching BullMQ job. Nothing is silently dropped.',
  },
  {
    question: 'Does WarmHawk use a custom queue, or is it built on something standard?',
    answer:
      'BullMQ on Redis — a widely used, battle-tested job queue library. WarmHawk’s value is the cadence, jitter, and rotation logic built on top of it, not a proprietary queue implementation.',
  },
  {
    question: 'Will a hand-rolled n8n workflow eventually hit a wall?',
    answer:
      'Usually around a handful of mailboxes. Rate-limiting logic that works for two mailboxes in Function nodes gets fragile fast at ten, and there’s no built-in weighted rotation to fall back on.',
  },
];

export default function CustomN8nComparisonPage() {
  return (
    <>
      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <div className="label text-rust mb-5">WarmHawk vs a custom n8n workflow</div>
            <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
              You could roll your own queue. Here&rsquo;s what that actually takes.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-9">
              A hand-built n8n workflow can send email. It won&rsquo;t give you a durable,
              crash-safe queue, per-domain cadence limits, or capacity-aware mailbox rotation
              without a lot of additional engineering &mdash; WarmHawk ships all of it as a
              dedicated BullMQ queue on Redis, with per-mailbox cadence math and weighted rotation
              built as first-class logic instead of hand-rolled inside a workflow canvas.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/checkout?tier=1" className="btn btn-primary">
                Start Tier 1 &mdash; $199/mo
              </Link>
              <Link href="/docs/quickstart" className="btn btn-ghost">
                Read the quickstart
              </Link>
            </div>
          </div>

          <div className="card p-7">
            <div className="label text-ink-muted mb-5">The architecture, at a glance</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">BullMQ</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">Redis-backed queue engine</div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="font-display text-2xl font-bold text-rust">AOF</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  persistence, everysec fsync
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">Auto</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  crash reconciliation cron
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THE ENGINE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            The queueing engine underneath WarmHawk
          </h2>
          <AnswerBlock>
            WarmHawk&rsquo;s queue is BullMQ on Redis, with two dedicated modules doing the actual
            thinking: computeNextSlotSeconds.ts calculates cadence and jitter per mailbox,
            enforcing an eight-minute floor so sends never look scripted, and enqueuer.ts picks the
            next mailbox by weighted, least-recently-used, capacity-aware rotation. Neither is a
            generic building block &mdash; both were purpose-built for this exact job.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              BullMQ itself is a well-known, widely deployed Redis job queue &mdash; WarmHawk
              didn&rsquo;t reinvent job queueing.{' '}
              <StatCite source="WarmHawk architecture">
                what&rsquo;s purpose-built is the pair of modules that sit on top of it:
                computeNextSlotSeconds.ts for timing, enqueuer.ts for mailbox selection
              </StatCite>
              . Every send that goes out has already passed through both before it ever reaches
              the wire.
            </p>
            <p>
              computeNextSlotSeconds.ts doesn&rsquo;t just enforce a flat delay &mdash; it
              calculates the next legal slot per mailbox, with an eight-minute floor and
              randomized jitter layered on so a sequence of sends never reads as a mechanical
              drip. enqueuer.ts then asks, for every job pulled off the queue: which connected
              mailbox has the least recent send, the most remaining daily capacity, and the best
              standing to take this one right now? That&rsquo;s the rotation decision, made fresh
              every time, automatically.
            </p>
          </div>
        </div>
      </div>

      {/* CRASH RECOVERY & DURABILITY */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          What happens when Redis crashes mid-send
        </h2>
        <AnswerBlock>
          If Redis crashes mid-send, an unflushed write can otherwise mean a silently dropped
          message with no error anywhere. WarmHawk prevents that with AOF persistence set to fsync
          every second, a noeviction memory policy, and a reconciliation cron that re-enqueues any
          lead or send row whose status implies it should be queued but has no matching BullMQ
          job.
        </AnswerBlock>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            The dangerous case in any queue-backed system isn&rsquo;t the crash itself &mdash;
            it&rsquo;s the write that happened just before it. A lead gets marked as
            &ldquo;sending&rdquo; in the database, the process dies before the matching job
            reaches Redis or before Redis flushes it to disk, and now there&rsquo;s a row that
            thinks it&rsquo;s in flight with nothing actually tracking it.{' '}
            <StatCite source="WarmHawk architecture">
              WarmHawk closes that gap with `appendfsync everysec` AOF persistence plus
              `maxmemory-policy noeviction`, so queued jobs survive a restart instead of being
              silently evicted under memory pressure
            </StatCite>
            .
          </p>
          <p>
            The reconciliation cron is the second layer: it periodically scans for any lead or
            send row whose status says it should be queued but has no corresponding BullMQ job,
            and re-enqueues it. That closes the write-then-crash gap completely &mdash; a
            dropped send either goes out on the retry pass or surfaces as a visible error, never as
            silence.
          </p>
          <p>
            <StatCite source="WarmHawk architecture">
              Queue growth is bounded, too: completed and failed BullMQ job records are capped by
              age and count
            </StatCite>
            , so Redis doesn&rsquo;t grow unbounded on a customer&rsquo;s own box with finite disk
            &mdash; a real constraint on self-hosted infrastructure that a managed, elastic SaaS
            backend doesn&rsquo;t have to think about the same way.
          </p>
        </div>
      </div>

      {/* WHAT N8N HAS TO SOLVE ITSELF */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            What a hand-rolled n8n workflow has to solve on its own
          </h2>
          <AnswerBlock>
            n8n is a genuinely good general workflow tool, but it has no built-in concept of
            per-mailbox weighted rotation, jitter, or cadence floors &mdash; an operator has to
            hand-build that logic in Function nodes. There&rsquo;s no first-class crash-recovery
            reconciliation either, so a stalled run at 2am can mean silently missed sends nobody
            notices until a client asks why replies stopped.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              None of this is a knock on n8n &mdash; it&rsquo;s an excellent tool for exactly what
              it&rsquo;s designed for: gluing APIs together into a workflow a human can read on a
              canvas. Cold-email sending just isn&rsquo;t that kind of problem. It needs
              per-mailbox state, timing math that has to run correctly thousands of times a day
              without drifting, and recovery behavior that works even when nobody&rsquo;s watching
              the workflow at 3am.
            </p>
            <p>
              In practice, a hand-rolled n8n cold-email sender tends to grow the same way: a
              Function node with a fixed delay, then a smarter Function node with some jitter
              math bolted on, then per-mailbox counters kept in a workflow&rsquo;s static data or
              an external key-value store, then error handling for the counters getting out of
              sync. Every one of those is solvable &mdash; but it&rsquo;s bespoke code that has to
              be maintained by whoever built it, with no upstream fixes or improvements arriving
              for free.
            </p>
            <p>
              Scale is usually where it breaks first. Rate-limiting logic that&rsquo;s fine for two
              mailboxes in a single Function node gets fragile fast at ten or twenty, especially
              once weighting by capacity or recency enters the picture &mdash; at that point
              it&rsquo;s effectively a bespoke job queue, just without the durability guarantees a
              purpose-built one has from day one.
            </p>
          </div>
        </div>
      </div>

      {/* CODE COMPARISON */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          The same problem, two very different amounts of code
        </h2>
        <p className="max-w-3xl mx-auto text-[15px] leading-relaxed text-ink-muted text-center mb-10">
          A minimal, illustrative sketch of what &ldquo;wait a safe amount of time, then pick a
          mailbox&rdquo; looks like on each side.{' '}
          <StatCite source="WarmHawk architecture">
            on WarmHawk&rsquo;s side, computeNextSlotSeconds.ts and enqueuer.ts are the only two
            calls a send ever needs &mdash; everything else, including crash recovery, runs
            underneath them automatically
          </StatCite>
          .
        </p>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <CodeBlock label="n8n Function node — hand-rolled">
{`// Runs inside a Function node on every item.
// Delay + rotation logic the operator owns and maintains.
const mailboxState = getWorkflowStaticData('global');
mailboxState.lastSent = mailboxState.lastSent || {};

const mailboxes = ['a@domain.com', 'b@domain.com'];
// naive round-robin: no capacity or recency awareness
const idx = (mailboxState.cursor || 0) % mailboxes.length;
mailboxState.cursor = idx + 1;
const mailbox = mailboxes[idx];

const last = mailboxState.lastSent[mailbox] || 0;
const minGapMs = 5 * 60 * 1000; // guessed, not derived
const wait = Math.max(0, minGapMs - (Date.now() - last));

// no jitter, no crash recovery if n8n restarts here,
// no reconciliation if this run silently stalls
await new Promise((r) => setTimeout(r, wait));
mailboxState.lastSent[mailbox] = Date.now();
return { mailbox };`}
          </CodeBlock>
          <CodeBlock label="WarmHawk — computeNextSlotSeconds.ts + enqueuer.ts">
{`// Handled automatically for every send, per mailbox.
const mailbox = enqueuer.pickMailbox({
  strategy: 'weighted-lru-capacity-aware',
});

const delaySeconds = computeNextSlotSeconds({
  mailbox,
  cadenceFloorSeconds: 480, // 8-minute floor
  jitter: true,
});

await bullmqQueue.add('send', payload, {
  delay: delaySeconds * 1000,
});
// AOF persistence + reconciliation cron cover
// crash recovery — no extra code required.`}
          </CodeBlock>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <div className="text-center mb-11 max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-2.5">
              DIY n8n workflow vs WarmHawk, side by side
            </h2>
          </div>
          <CompareTable themLabel="DIY n8n workflow" rows={compareRows} />
        </div>
      </div>

      <div className="wrap">
        <ComparisonCallout />
      </div>

      <FaqSection items={faqItems} />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Keep the flexibility. Skip the queue engineering.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            WarmHawk&rsquo;s API slots in wherever your own workflow already lives.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/docs/quickstart" className="btn btn-primary">
              Read the quickstart
            </Link>
            <Link
              href="/checkout?tier=1"
              className="btn btn-on-dark"
            >
              Start Tier 1 &mdash; $199/mo
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
