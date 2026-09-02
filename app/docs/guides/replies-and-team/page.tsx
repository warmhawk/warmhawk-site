import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Replies & team',
  description:
    'How WarmHawk polls IMAP for replies, classifies them (INTERESTED, OUT_OF_OFFICE, OPT_OUT, and more) via AI with a keyword-heuristic fallback, and how team access works on Tier 1/2.',
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
      'It falls back to a keyword-heuristic classifier (checking for phrases like "unsubscribe," "out of office," "not interested") rather than leaving every reply UNCLASSIFIED — so a transient AI-provider outage never silently drops the compliance-sensitive OPT_OUT case.',
  },
  {
    question: 'Is team management part of the core-engine API?',
    answer:
      "No — team invite/remove with flat permissions is a warmhawk-enterprise-operator (dashboard) feature, available on Tier 1/2. Tier 0's API has no concept of a team at all; it authenticates against its own single-account User table.",
  },
  {
    question: 'Can I filter replies by classification or mailbox?',
    answer:
      'Yes — GET /v1/replies accepts classification, campaignId, and mailboxId query params, any combination, for exactly this kind of Unified Reply Inbox filtering.',
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
        (INTERESTED, NOT_INTERESTED, OUT_OF_OFFICE, AUTO_REPLY, OPT_OUT, UNCLASSIFIED) via your BYOK
        AI key with a keyword-heuristic fallback, and automatically suppresses an OPT_OUT lead. Team
        invite/remove with flat permissions lives in the Tier 1/2 operator dashboard, not the
        open-core API.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">How a reply gets classified</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A reply row is created (internally, from the IMAP-polling pipeline) with the raw message
        content, then classified &mdash; by your connected AI key when one is configured, or by a
        resilient keyword-heuristic fallback when the AI call itself fails, so a provider outage
        never silently drops a reply to <code className="font-mono">UNCLASSIFIED</code> and misses a
        compliance-sensitive opt-out.
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
        <code className="font-mono">AUTO_REPLY</code>, <code className="font-mono">OPT_OUT</code>,{' '}
        <code className="font-mono">UNCLASSIFIED</code>. An{' '}
        <code className="font-mono">OPT_OUT</code> classification &mdash; from the AI or the keyword
        fallback &mdash; adds the lead&rsquo;s email to the same suppression list a manual{' '}
        <code className="font-mono">POST /v1/leads/:id/suppress</code> uses, so it stops future
        sends immediately, not just on the next dashboard review.
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
