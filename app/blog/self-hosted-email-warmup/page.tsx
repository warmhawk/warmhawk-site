import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'self-hosted-email-warmup')!;

export const metadata: Metadata = pageSeo({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question:
      'Do I need separate mailboxes just for warmup, or can real mailboxes warm each other?',
    answer:
      'Real sending mailboxes can warm each other — that is the whole mechanic of a self-hosted setup. A small team running 5-10 mailboxes across a few domains has enough mailboxes to exchange warmup traffic between them; a solo sender with one mailbox has nothing to exchange with locally and either needs a second mailbox to pair with or a real-send ramp from day one.',
  },
  {
    question:
      'Can I self-host warmup without self-hosting the rest of my cold-email infrastructure?',
    answer:
      'Not cleanly — warmup needs to run on the same sending infrastructure it is protecting, since the point is building a track record for the exact mailbox and sending pattern that will later carry real volume. Bolting a separate warmup-only tool onto a different sending platform reintroduces the shared-network question this whole approach is trying to avoid.',
  },
  {
    question: 'How many mailboxes do I need before self-hosted warmup makes sense?',
    answer:
      "There's no hard floor, but the mechanic gets easier with more mailboxes to pair across. Two mailboxes can warm each other in a basic loop; a handful across 2-3 domains gives you enough variety in send/receive pairs that the traffic doesn't look like a closed two-node loop, which is itself a pattern receivers can notice.",
  },
  {
    question: 'What happens if my inbox rate drops below 90% partway through the ramp?',
    answer:
      'Slow or pause the ramp at the volume it was at, not the volume you were about to move to. A dip usually means the mailbox needs another week at the same level before receivers extend more trust — pushing volume up anyway compounds the exact behavior (a low-reputation address suddenly sending more) that triggered the caution in the first place.',
  },
];

export default function SelfHostedEmailWarmupPost() {
  return (
    <>
      <div className="wrap py-16">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              blogPostingSchema({
                title: post.title,
                description: post.description,
                path: `/blog/${post.slug}`,
                datePublished: post.date,
              }),
            ),
          }}
        />
        <div className="label text-rust mb-5">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>{' '}
          / Warmup
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          Self-hosted warmup means your own mailboxes exchange warmup mail with each other while a
          small, real-send ramp layers in on top &mdash; no vendor&rsquo;s shared network of other
          customers&rsquo; accounts involved. Track inbox placement over a rolling 7-day window and
          treat a sustained 90%+ rate as the graduation signal, not a fixed number of days on the
          calendar.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What &ldquo;self-hosted&rdquo; actually changes about warmup
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Warmup needs real traffic to exchange &mdash; sends, opens, replies, and the occasional
          rescue-from-spam, on a schedule that reads as ordinary human email behavior rather than a
          script. That traffic has to come from somewhere, and the &ldquo;somewhere&rdquo; is
          exactly what changes when you self-host: instead of a vendor enrolling your mailbox in a
          network of every other customer&rsquo;s accounts, your own mailboxes provide it. A small
          team with 5-10 mailboxes across a couple of domains already has enough sending pairs to
          exchange warmup traffic internally, with nothing routed through infrastructure you
          don&rsquo;t control.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Two things run in parallel, not in sequence. First, mailbox-to-mailbox exchange builds a
          baseline sending and receiving history without ever touching a real prospect &mdash; this
          is what most people picture when they think &ldquo;warmup.&rdquo; Second, a real-send ramp
          layers a small, deliberately controlled number of genuine outbound sends on top once
          baseline engagement looks healthy, so the mailbox&rsquo;s history isn&rsquo;t 100%
          synthetic traffic by the time it needs to carry real volume. See{' '}
          <Link href="/blog/what-is-email-warmup" className="text-rust font-semibold">
            the full warmup mechanics and 2-4 week timeline
          </Link>{' '}
          for how that ramp curve is shaped week to week.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Why shared pools are a fragile bet
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Receivers don&rsquo;t only score individual mailboxes in isolation &mdash; they also look
          for patterns across related sending infrastructure. A large group of mailboxes that
          consistently email each other, on correlated IP ranges or through the same shared sending
          platform, can read as exactly that kind of related cluster. When one participant in that
          cluster trips a spam-complaint spike or lands on a blocklist, the negative signal
          isn&rsquo;t necessarily contained to that one domain &mdash; it can shape how the receiver
          treats the pattern the whole pool represents. See{' '}
          <Link href="/blog/dedicated-ip-vs-shared-warmup-pool" className="text-rust font-semibold">
            the actual mechanism, including a documented case of a warmup vendor&rsquo;s own shared
            network getting a customer&rsquo;s brand-new domains reputation-blocked
          </Link>{' '}
          through no fault of that customer&rsquo;s own sending behavior.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Self-hosting doesn&rsquo;t make a mailbox immune to reputation problems &mdash;
          authentication gaps, bad list quality, and aggressive sending still hurt exactly as much.
          What it removes is one specific, avoidable variable: reputation risk imported from other
          customers you&rsquo;ve never interacted with, sharing infrastructure you have no
          visibility into and no ability to audit.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What to actually measure: rolling 7-day inbox rate
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          A single day&rsquo;s placement result is noisy &mdash; a handful of test sends landing in
          spam on one day doesn&rsquo;t necessarily mean the ramp is failing, and a perfect day
          doesn&rsquo;t mean it&rsquo;s safe to jump volume. The useful number is a rolling window:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            <strong>Seed a small set of real inboxes you own</strong> across Gmail, Outlook, and
            Yahoo, and BCC or route warmup/real sends through them.
          </li>
          <li>
            <strong>Log the folder each one lands in</strong> &mdash; inbox, spam, or promotions
            &mdash; for every check, not just the ones that look good.
          </li>
          <li>
            <strong>Compute inbox rate over the trailing 7 days</strong>, not a single day&rsquo;s
            snapshot: inbox placements divided by total checks across that window.
          </li>
          <li>
            <strong>Graduate at a sustained 90%+ rate</strong>, not a fixed day count on the
            calendar &mdash; a mailbox that hits 90% on day 12 is ready sooner than a generic
            &ldquo;3-week rule,&rdquo; and one still at 70% on day 21 isn&rsquo;t ready no matter
            how long it&rsquo;s been running.
          </li>
        </ul>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          This is the same principle behind seed-inbox placement sampling as a first-party signal
          rather than a vendor&rsquo;s self-reported &ldquo;heat score&rdquo; &mdash; a score
          measures the warmup network&rsquo;s internal traffic, while a real seed-inbox check
          measures where your mail actually lands.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          A practical ramp schedule
        </h2>
        <div className="card overflow-hidden overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="label text-left p-5 text-ink-muted font-semibold">Window</th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Mailbox-to-mailbox exchange
                </th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Real-send layer
                </th>
                <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                  Gate to advance
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-5 border-t border-border align-top">Week 1</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Low, steady volume between your own mailboxes only
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  None yet
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Bounces near zero, nothing flagged as spam
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Week 2</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Volume roughly doubles if week 1 stayed clean
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  A handful of real sends per day begin layering in
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Rolling 7-day inbox rate trending upward
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Weeks 3-4</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Continues stepping up toward baseline target
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Real-send volume steps up on the same cadence
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Rolling 7-day inbox rate holding at 90%+
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Graduated</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Tapers off as real volume takes over
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Full target cold-send volume for that mailbox
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Keep sampling placement — a graduated mailbox can still regress
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Compressing this defeats the purpose: reputation is built from a pattern over time, not
          raw send count, so a mailbox that jumps straight to full volume reads to a receiver as
          exactly the anomaly this whole process exists to avoid creating.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What self-hosting changes structurally
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          WarmHawk&rsquo;s core sending engine is source-available under the Business Source License
          (BSL 1.1) &mdash; a non-compete grant that converts to Apache 2.0 after four years, not an
          OSI open-source license, but code you can read, run, and self-host on your own server
          today. Tier 0 is free and gives you the full sending/queueing engine via direct API access
          &mdash; no dashboard, no SLA, nothing metered &mdash; which is enough to run the
          mailbox-to-mailbox exchange and real-send ramp described above entirely on infrastructure
          you control. Tier 1 adds the operator dashboard, domain health alerts, and a
          founder-staffed support SLA for $199/mo flat, with unlimited mailboxes, domains, and users
          on that same fee &mdash; the mailbox count you&rsquo;re warming doesn&rsquo;t change what
          you pay. Every account runs on its own containers, database, and network, with nothing
          shared at the application layer with any other WarmHawk customer, which is what makes the
          shared-pool exposure described above a non-issue by construction rather than a policy
          promise.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">
            Run warmup on infrastructure you actually control
          </h2>
          <p className="text-[15px] text-ink-muted mb-4">
            Tier 0 is free, self-hosted, and API-only — install it and check the first domain in
            under 10 minutes.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/docs/quickstart" className="text-rust font-semibold">
              Get the free engine &rarr;
            </Link>
            <Link href="/tools/domain-check" className="text-rust font-semibold">
              Check a domain&rsquo;s current health &rarr;
            </Link>
          </div>
        </div>
      </div>

      <FaqSection items={faqItems} title="Self-hosted warmup: questions worth answering up front" />
    </>
  );
}
