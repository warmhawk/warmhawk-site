import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Warm-up: how a new mailbox earns the inbox',
  description:
    'How WarmHawk warms a new mailbox with your own mailboxes and test inboxes: the daily ramp, where each email landed, Promotions-tab detection, and graduating on a measured inbox rate.',
  path: '/docs/guides/warm-up',
});

const faqItems = [
  {
    question: 'Does WarmHawk use a shared warm-up network?',
    answer:
      'No. A mailbox only emails your own other mailboxes and the test inboxes you add under Seed Accounts. There is no pool shared with other customers, so nobody else’s mail affects your reputation and your warm-up emails never land in a stranger’s inbox.',
  },
  {
    question: 'How long does warm-up take?',
    answer:
      'At least 14 days. A mailbox moves to Active only when it is on day 14 or later, has at least 20 checked emails in the last 7 days, and 90% or more of them reached the inbox. A mailbox that keeps landing in spam stays in warm-up for as long as that takes.',
  },
  {
    question: 'Does a Promotions-tab landing count as the inbox?',
    answer:
      'No. A warm-up email found in Gmail’s Promotions tab is recorded as PROMOTIONS. It counts as checked but not as inbox, so it lowers the health score the same way spam does.',
  },
  {
    question: 'Do warm-up emails clutter my inbox?',
    answer:
      'No. Once WarmHawk has checked where a warm-up email landed, it marks it read and files it under a “WarmHawk warmup” folder (a label in Gmail). One found in spam is starred and moved to the inbox first, which is what a person does with mail they wanted.',
  },
  {
    question: 'Can I pause warm-up for one mailbox?',
    answer:
      'Yes. PATCH /v1/mailboxes/:id with { "warmupEnabled": false } stops its warm-up sends; set it back to true to resume. Pausing the mailbox itself (status PAUSED) stops warm-up too.',
  },
];

const ramp = [
  { stage: 'Day 1', volume: '2 warm-up emails' },
  { stage: 'Each day after', volume: '20% more than the day before, up to 20 a day' },
  { stage: 'After graduation', volume: '3 warm-up emails a day, to keep measuring health' },
  {
    stage: 'Campaign emails after graduation',
    volume: 'Start at 5 a day, grow 20% a day, never above the mailbox’s dailyCap',
  },
];

const placements = [
  { result: 'INBOX', meaning: 'Reached the inbox.', counts: 'Counts as inbox' },
  {
    result: 'PROMOTIONS',
    meaning: 'Reached Gmail’s Promotions tab.',
    counts: 'Checked, not inbox',
  },
  {
    result: 'SPAM',
    meaning: 'Landed in spam, then moved to the inbox (rescued).',
    counts: 'Checked, not inbox',
  },
  {
    result: 'MISSING',
    meaning: 'Not in the inbox or spam 2 hours after sending.',
    counts: 'Checked, not inbox',
  },
  { result: 'BOUNCED', meaning: 'The mail server sent it back.', counts: 'Checked, not inbox' },
  { result: 'PENDING', meaning: 'Sent, waiting for the check.', counts: 'Not yet' },
  {
    result: 'UNCHECKED',
    meaning: 'The receiving mailbox couldn’t be opened for 6 hours.',
    counts: 'Not counted',
  },
  {
    result: 'FAILED',
    meaning: 'It never left; the send log has the reason.',
    counts: 'Not counted',
  },
];

export default function WarmUpPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Guides / Warm-up</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        A new mailbox earns the inbox before it sends a campaign.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        A new mailbox has no sending reputation, so mail providers are cautious with it. Warm-up
        builds that reputation with a few real emails a day and measures where every one of them
        lands.
      </p>
      <AnswerBlock>
        Every new WarmHawk mailbox starts in warm-up. It emails your other mailboxes and test
        inboxes a few times a day (2 on day 1, growing 20% a day up to 20), WarmHawk checks whether
        each email reached the inbox, spam or Gmail&rsquo;s Promotions tab, and the mailbox moves to
        Active only once at least 90% of its checked emails in the last 7 days reached the inbox,
        from day 14 on. No shared network: partners are only inboxes you own.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Who a mailbox emails</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A partner is any inbox WarmHawk can read over IMAP afterwards: another of your connected
        mailboxes, or a test inbox you add under Seed Accounts (
        <code className="font-mono">/v1/seed-accounts</code>). Partners on another domain come
        first. A mailbox needs at least one partner; with none, warm-up waits and the dashboard says
        to add a second mailbox or a test inbox.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">One at a time per inbox.</strong> No inbox gets two warm-up
          emails within 5 minutes, so several of your mailboxes never hit one inbox in the same
          minute.
        </li>
        <li>
          <strong className="text-ink">Mailboxes take turns.</strong> The order is random each
          round, so no mailbox always goes first.
        </li>
        <li>
          <strong className="text-ink">No repeated subjects.</strong> A subject an inbox saw in the
          last 3 days isn&rsquo;t sent to it again.
        </li>
        <li>
          <strong className="text-ink">Spread through the day.</strong> Sends are spaced across a
          16-hour day rather than in a burst, through the same connection your campaigns use, with
          no tracking code and no footer.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-semibold mb-4">The daily ramp</h2>
      <div className="card overflow-hidden overflow-x-auto max-w-2xl mb-4">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">When</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                How many
              </th>
            </tr>
          </thead>
          <tbody>
            {ramp.map((row) => (
              <tr key={row.stage}>
                <td className="p-4 border-t border-border align-top text-ink">{row.stage}</td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.volume}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        A warm-up day is the 24 hours from the mailbox&rsquo;s first warm-up send, not a calendar
        day, so each day sends exactly its target. Warm-up emails don&rsquo;t count against the
        mailbox&rsquo;s campaign <code className="font-mono">dailyCap</code>.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Where each email landed</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A few minutes after a send, WarmHawk opens the receiving mailbox and looks in the inbox,
        every spam folder and, in Gmail, the Promotions tab. Each email gets one result:
      </p>
      <div className="card overflow-hidden overflow-x-auto max-w-3xl mb-4">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Result</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                Meaning
              </th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                Health score
              </th>
            </tr>
          </thead>
          <tbody>
            {placements.map((row) => (
              <tr key={row.result}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">
                  {row.result}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.meaning}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.counts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        The health score is the share of checked emails in the last 7 days that reached the inbox. A
        rescued email still counts as spam: it landed there, and moving it doesn&rsquo;t change
        that. Checked emails are marked read and filed under &ldquo;WarmHawk warmup&rdquo; so they
        don&rsquo;t fill your inbox.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Graduating, and falling back</h2>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">Graduate to Active</strong> on day 14 or later, with at least
          20 checked emails in the last 7 days and a health score of 90 or more.
        </li>
        <li>
          <strong className="text-ink">Back to warm-up</strong> if an Active mailbox&rsquo;s health
          drops below 70 over at least 10 checked emails. The 3 warm-up emails a day it keeps
          sending are what make this measurable.
        </li>
        <li>
          <strong className="text-ink">Campaigns wait.</strong> A warming mailbox can be ticked on a
          campaign and joins its rotation once it graduates, then ramps up as in the table above.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Graduation is never on a calendar alone: a mailbox that keeps landing in spam stays in
        warm-up until the numbers say otherwise. See{' '}
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>{' '}
        for the DNS and blocklist checks that usually explain a low score.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">The warm-up API</h2>
      <CodeBlock label="GET /v1/warmup — one row per mailbox">
        {`curl https://app.yourcompany.com/v1/warmup -H "Authorization: Bearer YOUR_API_KEY"
# summary: { warming, graduated, averageHealth, savedFromSpam, sent }
# mailboxes[]: mailboxId, email, stage, day, todayTarget, sentToday, health, checked,
#   counts { inbox, promotions, spam, missing, bounced, pending, ... },
#   partnerCount, campaignCapToday, dailyCap, lastBounce, nextStep`}
      </CodeBlock>
      <CodeBlock label="GET /v1/warmup/:mailboxId/messages — the send log">
        {`curl "https://app.yourcompany.com/v1/warmup/mbx_a1b2c3/messages?result=promotions&period=7d&page=1" \\
  -H "Authorization: Bearer YOUR_API_KEY"
# result: inbox | promotions | spam | moved | missing | bounced | pending | unchecked | failed
# period: 24h | 7d | 30d | all — newest first, { messages, total, page, pageSize }`}
      </CodeBlock>
      <CodeBlock label="POST /v1/warmup/:mailboxId/send-now — send one right away">
        {`curl -X POST https://app.yourcompany.com/v1/warmup/mbx_a1b2c3/send-now \\
  -H "Authorization: Bearer YOUR_API_KEY"
# 201 { "status": "sent", "messageId": "...", "to": "partner@yourcompany.com" }
# 409 no partner to send to · 422 mailbox paused or not fully connected · 502 the send failed`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        <code className="font-mono">moved</code> filters to emails that landed in spam and were
        moved to the inbox; <code className="font-mono">spam</code> includes them. Turn warm-up off
        or on for one mailbox with{' '}
        <code className="font-mono">PATCH /v1/mailboxes/:id {'{ "warmupEnabled": false }'}</code>.
      </p>

      <FaqSection items={faqItems} title="Warm-up: questions worth answering up front" />
    </div>
  );
}
