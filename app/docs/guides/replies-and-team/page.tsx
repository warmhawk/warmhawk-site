import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Replies & team: IMAP reply detection and access',
  description:
    'How WarmHawk polls IMAP for replies, classifies them (INTERESTED, OUT_OF_OFFICE, OPT_OUT) with AI plus a keyword fallback, and how Tier 1/2 team access works.',
  path: '/docs/guides/replies-and-team',
});

const faqItems = [
  {
    question: 'Does an OPT_OUT reply automatically suppress the lead?',
    answer:
      'Yes — reply classification is wired directly into the same SuppressionEntry mechanism a manual "suppress" action uses, so an AI-classified opt-out stops future sends without a human having to act on it first.',
  },
  {
    question: 'What happens if the AI reply classifier is unavailable?',
    answer:
      'It falls back to a keyword-heuristic classifier (checking for phrases like "unsubscribe," "out of office," "not interested") rather than leaving every reply UNCLASSIFIED. The same keyword check runs when no AI key is connected at all, so an install without AI still catches opt-outs. Quoted earlier messages and WarmHawk’s own footer are stripped first, so a reply that only quotes your “Unsubscribe” link isn’t read as an opt-out.',
  },
  {
    question: 'Does an out-of-office reply stop the follow-ups?',
    answer:
      'No, it pauses them. WarmHawk reads the return date from the reply and sends the next follow-up the day after it, or a week later when the reply names no date. An auto-reply such as a support ticket acknowledgement leaves the sequence running as scheduled. A reply saying the person has left the company, or that the address is no longer monitored, is labelled LEFT_COMPANY and ends the sequence.',
  },
  {
    question: 'Is team management part of the core-engine API?',
    answer:
      "No — team invite/remove with flat permissions is a warmhawk-enterprise-operator (dashboard) feature, available on Tier 1/2. Tier 0's API has no concept of a team at all; it authenticates against its own single-account User table.",
  },
  {
    question: 'Can I filter replies by classification or mailbox?',
    answer:
      'Yes — GET /v1/replies accepts classification, campaignId, mailboxId and domainId query params, any combination, for exactly this kind of Unified Reply Inbox filtering.',
  },
];

export default function RepliesAndTeamPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Guides / Replies &amp; team</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Every reply gets read, one way or another.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Replies are polled from each mailbox&rsquo;s IMAP inbox, classified, and &mdash; for an
        opt-out &mdash; wired straight into suppression. Team access is a Tier 1/2 dashboard
        concept, layered on top of the same account.
      </p>
      <AnswerBlock>
        WarmHawk polls IMAP for replies to sends still awaiting one, classifies each reply
        (INTERESTED, NOT_INTERESTED, OUT_OF_OFFICE, AUTO_REPLY, LEFT_COMPANY, OPT_OUT, UNCLASSIFIED)
        via your BYOK AI key with a keyword-heuristic fallback, and automatically suppresses an
        OPT_OUT lead. Team invite/remove with flat permissions lives in the Tier 1/2 operator
        dashboard, not the open-core API.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">How a reply gets classified</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A reply row is created (internally, from the IMAP-polling pipeline) with the raw message
        content, then classified &mdash; by your connected AI key when one is configured, or by a
        keyword-heuristic classifier when there is no AI key or the AI call fails, so a missing key
        or a provider outage never silently drops a reply to{' '}
        <code className="font-mono">UNCLASSIFIED</code> and misses a compliance-sensitive opt-out.
        Quoted earlier messages and WarmHawk&rsquo;s own footer are stripped before classifying, so
        a reply that quotes your unsubscribe line isn&rsquo;t read as an opt-out.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A reply from a person ends that lead&rsquo;s sequence: no more follow-ups go out once
        someone has written back. A machine&rsquo;s answer doesn&rsquo;t (see{' '}
        <a href="#away-notices" className="text-rust font-semibold">
          away notices and auto-replies
        </a>
        ). Filter the list with <code className="font-mono">classification</code>,{' '}
        <code className="font-mono">campaignId</code>, <code className="font-mono">mailboxId</code>{' '}
        or <code className="font-mono">domainId</code>.
      </p>
      <CodeBlock label="GET /v1/replies — filterable, dashboard-facing">
        {`curl "https://app.yourcompany.com/v1/replies?classification=INTERESTED&campaignId=camp_g7h8i9" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <CodeBlock label="PATCH /v1/replies/:id — re-classify by hand">
        {`curl -X PATCH https://app.yourcompany.com/v1/replies/rep_x1y2z3 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "classification": "INTERESTED" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Classification labels: <code className="font-mono">INTERESTED</code>,{' '}
        <code className="font-mono">NOT_INTERESTED</code>,{' '}
        <code className="font-mono">OUT_OF_OFFICE</code>,{' '}
        <code className="font-mono">AUTO_REPLY</code>,{' '}
        <code className="font-mono">LEFT_COMPANY</code>, <code className="font-mono">OPT_OUT</code>,{' '}
        <code className="font-mono">UNCLASSIFIED</code>. An{' '}
        <code className="font-mono">OPT_OUT</code> classification &mdash; from the AI or the keyword
        fallback &mdash; adds the lead&rsquo;s email to the same suppression list a manual{' '}
        <code className="font-mono">POST /v1/leads/:id/suppress</code> uses, so it stops future
        sends immediately, not just on the next dashboard review.
      </p>

      <h2 id="away-notices" className="font-display text-2xl font-semibold mb-4">
        Away notices and auto-replies
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every reply stops the lead&rsquo;s follow-ups the moment it arrives, so nothing goes out
        while it waits for its label. The label then decides what happens:
      </p>
      <ul className="list-disc pl-6 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4 space-y-1">
        <li>
          <code className="font-mono">OUT_OF_OFFICE</code>: the follow-ups pause. The next one goes
          out the day after the return date the reply names (&ldquo;back October 20&rdquo;,
          &ldquo;returning 10/20&rdquo;, &ldquo;back Monday&rdquo;), or a week after the reply when
          it names none. It is never sent earlier than the sequence already had it.
        </li>
        <li>
          <code className="font-mono">AUTO_REPLY</code> (a ticket number, &ldquo;we&rsquo;ll get
          back to you&rdquo;): the sequence carries on as scheduled.
        </li>
        <li>
          <code className="font-mono">LEFT_COMPANY</code> (&ldquo;no longer with the company&rdquo;,
          &ldquo;this mailbox is no longer monitored&rdquo;) and every other label: the sequence
          stays stopped.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A lead that has had a real answer stays stopped, whatever auto-replies come after it.
        Relabelling a reply with <code className="font-mono">PATCH /v1/replies/:id</code> moves its
        lead with the new label. The Replies page shows where each lead stands under its label:
        &ldquo;Follow-ups paused until Oct 21&rdquo;, &ldquo;Follow-ups continue&rdquo; or
        &ldquo;Follow-ups cancelled&rdquo;.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Before v1.26.0, away notices and auto-replies ended the sequence too. To start those
        leads&rsquo; follow-ups again, run this on the server. Without{' '}
        <code className="font-mono">--yes</code> it only counts them.
      </p>
      <CodeBlock label="Resume leads an away notice or auto-reply stopped">
        {`warmhawk replies resume-auto-replied
warmhawk replies resume-auto-replied --yes`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        Away notices among them wait for their return date like a new one would. Leads with any
        other reply stay stopped.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Team access (Tier 1/2, dashboard-side)
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Tier 0&rsquo;s open-core API has no team concept &mdash;{' '}
        <code className="font-mono">POST /v1/auth/login</code> authenticates against a
        single-account <code className="font-mono">User</code> table on the engine itself. Team
        invite/remove with flat, shared permissions is a{' '}
        <code className="font-mono">warmhawk-enterprise-operator</code> dashboard feature on Tier
        1/2: every invited teammate sees everything in that one account &mdash; it is not per-client
        data isolation between an agency&rsquo;s own separate clients (see{' '}
        <Link href="/compare/pricing" className="text-rust font-semibold">
          the pricing comparison
        </Link>{' '}
        for that distinction spelled out in full). 2FA/MFA on dashboard login is also a Tier 1/2
        feature, layered on top of the same account.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Reply polling runs as an internal n8n workflow calling{' '}
          <code className="font-mono">GET /replies/pending</code> and the IMAP fetch-reply endpoint
          &mdash; both internal-only, guarded by a shared callback secret and reachable only over
          the instance&rsquo;s internal Docker network, never exposed publicly. See{' '}
          <Link href="/docs/self-hosting/architecture" className="text-rust font-semibold">
            Architecture
          </Link>{' '}
          for how the internal-only network boundary works.
        </p>
      </div>

      <FaqSection items={faqItems} title="Replies & team: questions worth answering up front" />
    </div>
  );
}
