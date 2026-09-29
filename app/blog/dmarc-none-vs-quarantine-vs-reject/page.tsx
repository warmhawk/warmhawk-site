import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'dmarc-none-vs-quarantine-vs-reject')!;

export const metadata: Metadata = pageSeo({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question: 'Can I go straight to p=reject without ever running p=none or p=quarantine?',
    answer:
      "You can publish it, but it's a genuinely risky move for any domain that has more than one legitimate sending source. Without first reading rua reports at p=none, you have no visibility into which of your own tools — a CRM, a helpdesk, a calendar invite sender — might fail alignment and get silently blocked the moment reject takes effect.",
  },
  {
    question: "What's the difference between rua and ruf reports?",
    answer:
      'rua (aggregate reports) are daily XML summaries listing every source that sent mail claiming to be your domain and whether SPF/DKIM passed and aligned — these are the ones worth setting up. ruf (forensic reports) would include per-message detail on individual failures, but most large receivers, including Gmail, no longer send them at all for privacy reasons, so treat ruf as effectively unsupported in 2026.',
  },
  {
    question: "Do I need DMARC if I'm not a high-volume bulk sender?",
    answer:
      "It's worth having regardless of volume, since it's what stops someone else from spoofing your domain in a phishing email — a risk that exists whether you send 10 emails a day or 10,000. Google and Yahoo's bulk-sender rules make it mandatory past 5,000 messages/day specifically, but the underlying protection is valuable at any sending volume.",
  },
  {
    question: 'Does p=quarantine mean the email disappears?',
    answer:
      'No — quarantine typically means the receiving mail server routes the message to spam/junk rather than the inbox, not that it deletes the message. reject is the policy that has the receiver refuse the message outright at SMTP time, which is the stronger and less forgiving of the two enforcement policies.',
  },
];

export default function DmarcPolicyPost() {
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
          / DMARC
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          p=none only watches and reports, with zero effect on delivery. p=quarantine routes mail
          that fails DMARC to spam. p=reject has the receiver refuse it outright at SMTP time. The
          safe path is none first &mdash; read your own rua reports for a few weeks &mdash; then a
          gradual quarantine rollout, then reject once quarantine has run clean.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What each policy actually does at the receiving end
        </h2>
        <div className="card overflow-hidden overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="label text-left p-5 text-ink-muted font-semibold">Policy</th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Receiver action on a DMARC failure
                </th>
                <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                  Risk if misconfigured
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-5 border-t border-border align-top">
                  <code className="font-mono">p=none</code>
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  None — mail is delivered exactly as it would be without DMARC
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  None — this is the safe, observation-only starting point
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">
                  <code className="font-mono">p=quarantine</code>
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Typically routed to spam/junk rather than the inbox
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  A legitimate but misaligned sender (e.g. an unauthenticated CRM) lands in spam
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">
                  <code className="font-mono">p=reject</code>
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Refused at SMTP time — the message never reaches the recipient at all
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  A legitimate but misaligned sender bounces completely, silently, with no inbox
                  trace
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          <code className="font-mono">pct=</code> and why it exists
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <code className="font-mono">pct=</code> applies your quarantine or reject policy to only a
          percentage of the mail that would otherwise be affected &mdash;{' '}
          <code className="font-mono">pct=25</code> means roughly a quarter of failing messages get
          the stricter treatment, while the rest are handled as if the policy were still{' '}
          <code className="font-mono">none</code>. It exists specifically so a rollout can catch a
          legitimate sending source you missed while reading rua reports, before that mistake
          affects 100% of your mail instead of a quarter of it. Ramping{' '}
          <code className="font-mono">pct=</code> from 25 to 50 to 100 over successive weeks,
          watching for complaints or missing mail at each step, is the standard way to de-risk
          moving off <code className="font-mono">none</code>.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          rua/ruf: the reports that tell you whether it&rsquo;s safe to tighten
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <code className="font-mono">rua=</code> is the address a domain&rsquo;s DMARC record
          publishes for aggregate reports &mdash; daily XML summaries, sent by every major receiver
          that honors DMARC, listing every source that sent mail claiming your domain and whether
          SPF and DKIM passed <em>and aligned</em> for it. This is the practical tool for the whole
          rollout: it is how you find out about a marketing platform, a helpdesk, or a calendar
          invite sender you forgot was sending as your domain, before tightening the policy blocks
          it. <code className="font-mono">ruf=</code> would provide forensic, per-message reports,
          but{' '}
          <StatCite source="DMARC reporting practice, 2026">
            most large receivers, including Gmail, no longer send forensic reports at all for
            privacy reasons
          </StatCite>
          , so <code className="font-mono">rua</code> is the one worth actually configuring.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">A safe rollout path</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            Publish <code className="font-mono">p=none</code> with a real{' '}
            <code className="font-mono">rua=</code> address, and let reports accumulate for at least
            2-4 weeks.
          </li>
          <li>
            Identify every legitimate sending source in those reports and fix SPF/DKIM alignment for
            each one — this is almost always where the real work is.
          </li>
          <li>
            Move to <code className="font-mono">p=quarantine; pct=25</code>, and watch for
            complaints about missing mail from real users, not just the reports.
          </li>
          <li>
            Step <code className="font-mono">pct=</code> up gradually — 25, then 50, then 100 —
            spacing each increase by at least a week.
          </li>
          <li>
            Move to <code className="font-mono">p=reject</code> only once quarantine has run clean
            at <code className="font-mono">pct=100</code> for a sustained stretch.
          </li>
        </ol>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Google and Yahoo&rsquo;s 2024+ bulk-sender floor
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <StatCite source="Google/Yahoo bulk sender requirements, effective February 2024, still in force September 2026">
            Anyone sending 5,000 or more messages a day to Gmail or Yahoo addresses must have a
            DMARC record in place for their sending domain, at minimum{' '}
            <code className="font-mono">p=none</code>
          </StatCite>
          , with SPF and DKIM both configured and at least one of the two in proper DMARC alignment
          &mdash; mail that fails this baseline gets rejected or bulk-foldered outright, independent
          of content or sender reputation otherwise. <code className="font-mono">p=none</code> is
          enough to satisfy the letter of that requirement, but it is only the visibility layer: it
          tells you who is sending as your domain, it does not stop anyone from doing so without
          your authorization.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Alignment: the part DMARC actually checks
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          DMARC itself doesn&rsquo;t authenticate anything new &mdash; it checks whether SPF or
          DKIM, which each verify something different, agree with the domain in the visible{' '}
          <code className="font-mono">From:</code> header. A message can pass SPF and pass DKIM
          individually and still fail DMARC if neither one is <em>aligned</em> to that{' '}
          <code className="font-mono">From:</code> domain &mdash; which is the exact gap that makes
          domain spoofing possible even when SPF and DKIM are both technically configured. See{' '}
          <Link href="/blog/spf-dkim-dmarc-explained" className="text-rust font-semibold">
            what each of the three mechanisms checks and how alignment ties them together
          </Link>{' '}
          for the full mechanism.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">
            Check your current DMARC policy
          </h2>
          <p className="text-[15px] text-ink-muted mb-4">
            See your live DMARC record, policy, and alignment settings — free, no account required.
          </p>
          <Link href="/tools/dmarc-checker" className="text-rust font-semibold">
            Check your DMARC record &rarr;
          </Link>
        </div>
      </div>

      <FaqSection items={faqItems} title="DMARC policy: questions worth answering up front" />
    </>
  );
}
