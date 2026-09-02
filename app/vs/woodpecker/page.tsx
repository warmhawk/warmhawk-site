import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

const compareRows: CompareRow[] = [
  {
    label: 'Mailbox rotation',
    them: 'Sequential, fixed order',
    us: 'Weighted, LRU, capacity-aware (enqueuer.ts)',
  },
  {
    label: 'AI personalization',
    them: 'Built-in model, reported as falling behind',
    us: 'BYOK — your own Gemini or Claude key',
  },
  {
    label: 'AI cost',
    them: 'Bundled into vendor pricing',
    us: 'Pay your provider directly, no markup',
  },
  {
    label: 'Send cadence',
    them: 'Same pace regardless of mailbox state',
    us: '8-min floor + jitter, per mailbox',
  },
  {
    label: 'Infrastructure',
    them: 'Shared multi-tenant SaaS',
    us: 'Your own containers, database, nginx, TLS',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Woodpecker — Weighted Rotation, BYOK AI vs Sequential Sending',
  description:
    'Compare WarmHawk and Woodpecker on mailbox rotation logic and AI personalization. See why weighted, capacity-aware rotation and BYOK Gemini/Claude beat sequential sending.',
  path: '/vs/woodpecker',
});

const faqItems = [
  {
    question: 'What does "weighted rotation" actually mean, compared to Woodpecker?',
    answer:
      'enqueuer.ts picks the next send based on which connected mailbox has spare capacity and hasn’t sent recently — not a fixed order. Woodpecker cycles mailboxes sequentially regardless of their current standing.',
  },
  {
    question: 'Do I need my own Gemini or Claude API key to use AI personalization?',
    answer:
      'Yes — that’s the point. You connect your own key, WarmHawk calls it directly on your behalf, and you pay your AI provider at cost. WarmHawk never marks up or resells usage.',
  },
  {
    question: 'Is WarmHawk trying to out-build Woodpecker feature-for-feature?',
    answer:
      'No. WarmHawk focuses on the mechanics that determine deliverability — rotation, cadence, and warmup — and lets you bring best-in-class AI models directly rather than building a proprietary one.',
  },
  {
    question: 'Can I switch from Woodpecker without losing my sequences?',
    answer:
      'Yes. CSV import and webhook ingestion both cover migration, and the Enterprise DFY tier includes white-glove list migration if you’d rather have it done for you.',
  },
  {
    question: 'Does rotation logic actually change deliverability outcomes?',
    answer:
      'Yes — a mailbox sent from at a fixed pace regardless of its capacity or warmup state is more likely to get flagged than one throttled dynamically based on its actual standing.',
  },
];

export default function WoodpeckerComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />
      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <div className="label text-rust mb-5">WarmHawk vs Woodpecker</div>
            <h1 className="font-display text-4xl md:text-[50px] leading-tight font-semibold mb-6">
              Rotation that actually knows which mailbox is rested.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-9">
              Woodpecker&rsquo;s mailbox rotation runs sequentially, not weighted by capacity, and
              the AI gap versus newer entrants keeps widening. WarmHawk&rsquo;s enqueuer.ts does
              weighted, capacity-aware rotation instead, and ships BYOK Gemini or Claude out of the
              box so personalization quality never depends on WarmHawk catching up to anyone.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/checkout?tier=1" className="btn btn-primary">
                Start Tier 1 &mdash; $199/mo
              </Link>
              <Link href="/compare/pricing" className="btn btn-ghost">
                See full pricing
              </Link>
            </div>
          </div>

          <div className="card p-7">
            <div className="label text-ink-muted mb-5">WarmHawk vs Woodpecker, at a glance</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">Weighted</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  capacity-aware rotation
                </div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="font-display text-2xl font-bold text-rust">BYOK</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">Gemini or Claude</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">$0</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">AI usage markup</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROTATION LOGIC */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            Sequential rotation treats every mailbox the same. They&rsquo;re not.
          </h2>
          <AnswerBlock>
            Woodpecker rotates sends across mailboxes in a fixed sequence, so every mailbox gets hit
            at the same pace regardless of its age, warmup status, or remaining daily capacity.
            WarmHawk&rsquo;s enqueuer.ts does weighted, least-recently-used, capacity-aware rotation
            instead &mdash; sends go to whichever mailbox has the room and the standing to take them
            safely, not just next in line.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              A round-robin doesn&rsquo;t know that mailbox A is three days old and mailbox B has
              been sending cleanly for six months. It just knows whose turn it is.{' '}
              <StatCite source="User reviews">
                Woodpecker users describe rotation as sequential rather than weighted, with no
                accounting for a given mailbox&rsquo;s current capacity or warmup progress
              </StatCite>
              , which means a fragile mailbox and a battle-tested one get identical treatment purely
              because of queue order.
            </p>
            <p>
              enqueuer.ts tracks how recently each mailbox sent, how much daily capacity it has
              left, and how it&rsquo;s been performing, then picks the best candidate for the next
              send &mdash; every time, automatically. A newer or lower-capacity mailbox naturally
              gets fewer, better-timed sends instead of being forced through the same cadence as
              everything else in the pool, which is the opposite of{' '}
              <StatCite source="User reviews">
                a fixed rotation order that can&rsquo;t adjust when one mailbox is clearly in worse
                shape than the rest of the pool
              </StatCite>
              .
            </p>
          </div>
        </div>
      </div>

      {/* AI ARMS RACE */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          The AI personalization gap is only getting wider
        </h2>
        <AnswerBlock>
          Woodpecker&rsquo;s AI personalization has lagged the market as Gemini and Claude got
          dramatically better at writing convincing, individualized outreach. WarmHawk lets you
          connect your own Gemini or Claude API key directly &mdash; you always use the current
          frontier model, and WarmHawk never marks up or resells a single token of your AI usage.
        </AnswerBlock>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            Building and maintaining a proprietary personalization model is a losing race against
            labs shipping monthly model upgrades.{' '}
            <StatCite source="User reviews">
              reviewers increasingly flag Woodpecker&rsquo;s built-in AI personalization as behind
              what general-purpose frontier models can now produce
            </StatCite>
            , and a vendor-owned model can&rsquo;t be swapped out the day a better one ships.
          </p>
          <p>
            WarmHawk doesn&rsquo;t try to win that race &mdash; it steps out of it. Bring your own
            Gemini or Claude key, and WarmHawk calls it directly on your behalf for personalization.
            You&rsquo;re always on whichever model you chose to pay for, at your provider&rsquo;s
            own rate, with nothing routed through a shared gateway that adds latency, cost, or a
            WarmHawk markup.
          </p>
        </div>
      </div>

      {/* WHY BOTH MATTER TOGETHER */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            Great personalization still needs a mailbox in good standing
          </h2>
          <AnswerBlock>
            Smart personalization matters less if the mailbox sending it is throttled, flagged, or
            exhausted before the message goes out. WarmHawk pairs BYOK AI personalization with
            weighted, capacity-aware rotation so every personalized message is sent from a mailbox
            that&rsquo;s actually in good standing &mdash; not whichever one was next in
            Woodpecker&rsquo;s fixed sequence.
          </AnswerBlock>
          <p className="max-w-3xl mx-auto text-[15px] leading-relaxed text-ink-muted">
            These two things compound. A better-written email from a mailbox that&rsquo;s been
            hammered out of turn still lands in spam regardless of how good the copy is &mdash;{' '}
            <StatCite source="User reviews">
              the same review threads that flag Woodpecker&rsquo;s rotation as sequential also
              describe deliverability problems that track the mailboxes hit hardest, not the
              messages sent
            </StatCite>
            . WarmHawk treats rotation and personalization as one problem: write the best message
            you can with the model you chose, then let queue logic decide the safest mailbox and
            moment to send it from &mdash; automatically, every time, without a dashboard setting to
            babysit.
          </p>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="wrap py-16 md:py-20">
        <div className="text-center mb-11 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-2.5">
            Rotation and AI, side by side
          </h2>
        </div>
        <CompareTable themLabel="Woodpecker" rows={compareRows} />
      </div>

      <div className="wrap">
        <ComparisonCallout />
      </div>

      <FaqSection items={faqItems} />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Rotation that respects your mailboxes.
          </h2>
          <p className="text-lg text-slate-soft mb-9">Capacity-aware, not a blind round-robin.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1 &mdash; $199/mo
            </Link>
            <Link href="/docs/quickstart" className="btn btn-on-dark">
              Get the free engine
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
