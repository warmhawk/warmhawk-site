import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'what-is-email-warmup')!;

export const metadata: Metadata = pageSeo({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question: 'How long does email warmup actually take?',
    answer:
      'In practice, 2-4 weeks for a brand-new domain and mailbox before it can safely carry full cold-outbound volume. Warmup ramps sending volume gradually while receivers build up a positive sending history for that mailbox — there is no way to compress that timeline without risking the reputation it is meant to build.',
  },
  {
    question: 'Can I skip warmup if my domain is already a few years old?',
    answer:
      'An aged domain helps, but a brand-new mailbox on it still has no sending history of its own. Warmup is about the specific sending address building a track record with receivers, not just domain age — a fresh mailbox on an old domain still needs a ramp, though often a shorter one than a domain registered yesterday.',
  },
  {
    question: "What's the difference between warmup and inbox-placement testing?",
    answer:
      'Warmup is the ramp-up process itself — gradually increasing volume so a mailbox earns sender reputation. Placement testing (or placement sampling) is a measurement: checking which folder — inbox, spam, or promotions — a real send actually landed in. Warmup builds the reputation; placement testing tells you whether it is actually working.',
  },
  {
    question: 'Does automated warmup work better than doing it manually?',
    answer:
      'Manual warmup — sending a handful of emails a day and gradually increasing volume by hand — works, but it is slow to set up correctly and easy to get wrong under deadline pressure, since the ramp curve and daily cap have to be tracked and adjusted by a person. Automated warmup enforces the ramp curve and cadence limits mechanically, which is the main reason most cold-email infrastructure includes it rather than leaving it to the sender.',
  },
  {
    question: 'How do I know if warmup is working or failing?',
    answer:
      'Watch open and reply rates on the warmup traffic itself, and check bounce/complaint rates stay near zero as volume increases. A rising bounce rate or a complaint rate approaching the 0.1% threshold receivers now enforce is the clearest early signal that a ramp is going too fast for that mailbox — the fix is to slow the ramp, not push through it.',
  },
];

export default function WhatIsEmailWarmupPost() {
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
          / Deliverability
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          Email warmup is the gradual, controlled increase of a mailbox&rsquo;s sending volume so
          receivers build up a positive reputation for it before it carries full outbound load. Skip
          it, and a brand-new mailbox sending at full volume on day one gets treated as suspicious
          by every major receiver, regardless of how good the copy is.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What warmup actually does to sender reputation
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Every major receiver — Gmail, Outlook, Yahoo — scores incoming mail partly on the sending
          mailbox&rsquo;s own history: how long the address has existed, how consistent its volume
          has been over that time, and how recipients have engaged with (or reported) its previous
          messages. A mailbox with no history is not scored neutrally; it is scored cautiously,
          because a brand-new address suddenly sending in bulk is exactly the pattern spam
          infrastructure also produces. Reputation, in other words, is inferred from behavior over
          time — a receiver has no other signal to go on for an address it has never seen before.
          Warmup exists to give that receiver a track record to score before the mailbox ever needs
          to carry real outbound volume.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          This is why warmup is a reputation mechanism and not a formality: the receiver is not
          checking a box that says &ldquo;this domain warmed up.&rdquo; It is continuously scoring
          engagement — opens, replies, and manual moves out of spam count as positive signals;
          bounces, spam-button clicks, and being ignored entirely count as negative ones — and a
          mailbox that skipped the ramp has none of the positive signal built up to offset the risk
          a brand-new sender inherently represents.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          The 2-4 week timeline, week by week
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="2026 deliverability research">
            A practical warmup ramp for a new domain and mailbox runs 2-4 weeks
          </StatCite>{' '}
          before it is ready for full cold-outbound volume. The shape of that ramp matters more than
          the exact numbers, since receiver-side scoring adapts to whatever mailbox and domain age
          it is looking at, but the general pattern looks like this:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            <strong>Week 1</strong> — a small, steady volume, low enough that even a 100% negative
            outcome (every message bouncing) would represent a handful of emails, not a pattern. The
            goal here is establishing that the mailbox sends and receives consistently, not volume.
          </li>
          <li>
            <strong>Week 2</strong> — volume roughly doubles if engagement stayed healthy in week 1:
            opens are happening, bounces are near zero, nothing has been marked as spam.
          </li>
          <li>
            <strong>Weeks 3-4</strong> — volume continues to step up toward the mailbox&rsquo;s real
            target sending rate, with the ramp slowing or pausing entirely if bounce or complaint
            signals start climbing rather than holding flat.
          </li>
        </ul>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Compressing that timeline defeats the purpose: reputation is built from a pattern over
          time, not from raw send count, so 500 emails sent on day two reads to a receiver as
          exactly the anomaly warmup exists to avoid creating — regardless of how those 500 emails
          perform individually.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          2026 deliverability rules that make warmup non-optional
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          Warmup used to be optional advice for anyone sending real volume. Three rule changes that
          took effect industry-wide make it a hard prerequisite instead:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            <StatCite source="Gmail/Yahoo bulk sender requirements">
              SPF and DKIM are now mandatory for any domain sending meaningful volume
            </StatCite>{' '}
            — missing either gets bulk mail rejected or bulk-foldered outright, independent of
            warmup status. Authentication and warmup solve different problems, but a domain failing
            authentication has no reputation worth warming in the first place.
          </li>
          <li>
            <StatCite source="Gmail/Yahoo bulk sender requirements">
              One-click unsubscribe (RFC 8058) headers are required on bulk mail
            </StatCite>
            , enforced at the receiver rather than left to sender discretion.
          </li>
          <li>
            <StatCite source="Gmail/Yahoo bulk sender requirements">
              The spam-complaint-rate threshold before a receiver throttles a sender has dropped to
              0.1%
            </StatCite>{' '}
            — a far tighter margin than a warming mailbox can afford to test against at full volume,
            since a handful of complaints on a low-volume warmup batch is a much smaller percentage
            than the same handful against a full-volume campaign.
          </li>
        </ul>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Check a domain&rsquo;s current SPF, DKIM, and DMARC setup against these requirements with{' '}
          <Link href="/tools/domain-check" className="text-rust font-semibold">
            WarmHawk&rsquo;s free domain health check
          </Link>{' '}
          before starting warmup — fixing an authentication gap after warmup has already begun means
          restarting the ramp, since the receiver has been scoring a misconfigured sender the entire
          time.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Manual warmup vs automated warmup vs shared warmup pools
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          There are three ways warmup actually gets done in practice, and they carry meaningfully
          different risk profiles:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            <strong>Manual</strong> — sending a small, hand-managed volume that increases gradually,
            often to a handful of personal or team inboxes. Works, but is slow to set up correctly
            and easy to get wrong under deadline pressure, since the ramp curve and daily cap have
            to be tracked and adjusted by a person every day.
          </li>
          <li>
            <strong>Automated, per-mailbox</strong> — software enforces the ramp curve and cadence
            limits mechanically for that specific mailbox, with no shared exposure to any other
            sender&rsquo;s behavior. The mailbox&rsquo;s reputation depends only on its own sending
            pattern.
          </li>
          <li>
            <strong>Shared warmup pool</strong> — the mailbox exchanges warmup mail with a network
            of other accounts across many customers of the same vendor, all warming simultaneously.
            Faster to bootstrap because the network already has volume to trade, but it ties your
            domain&rsquo;s reputation to strangers you&rsquo;ve never met and can&rsquo;t audit —
            see{' '}
            <Link
              href="/blog/dedicated-ip-vs-shared-warmup-pool"
              className="text-rust font-semibold"
            >
              the dedicated-vs-shared reputation risk
            </Link>{' '}
            for the actual mechanism by which that goes wrong.
          </li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          After warmup: check placement, don&rsquo;t just trust a score
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
          Warmup builds reputation; it doesn&rsquo;t, by itself, tell you whether that reputation is
          translating into actual inbox placement. A warmup tool&rsquo;s own internal score can read
          as healthy while real sends are still landing in spam or promotions for a real recipient,
          because the score is measuring the warmup network&rsquo;s internal traffic, not your live
          campaign&rsquo;s outcome. The only way to know for sure is to check where real sends
          actually land — by BCC&rsquo;ing your own seed inboxes across providers on a real send and
          checking the folder each one lands in — rather than relying solely on a dashboard number
          produced by the warmup process itself.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">
            Check your domain&rsquo;s warmup prerequisites
          </h2>
          <p className="text-[15px] text-ink-muted mb-4">
            SPF, DKIM, DMARC, MX, and blocklist status — free, no account required.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/tools/spf-checker" className="text-rust font-semibold">
              SPF checker &rarr;
            </Link>
            <Link href="/tools/dkim-checker" className="text-rust font-semibold">
              DKIM checker &rarr;
            </Link>
            <Link href="/tools/dmarc-checker" className="text-rust font-semibold">
              DMARC checker &rarr;
            </Link>
            <Link href="/tools/domain-check" className="text-rust font-semibold">
              Full domain health check &rarr;
            </Link>
          </div>
        </div>
      </div>

      <FaqSection items={faqItems} title="Email warmup: questions worth answering up front" />
    </>
  );
}
