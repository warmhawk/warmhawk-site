import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { StatCite } from '@/components/StatCite';
import { DomainCheckTool } from '@/components/DomainCheckTool';

export const metadata: Metadata = pageSeo({
  title: 'Free SPF, DKIM, DMARC & List-Unsubscribe Checker',
  description:
    'Free SPF/DKIM/DMARC checker, RFC 8058 List-Unsubscribe checker, and blocklist lookup for any sending domain. Instant PASS/FAIL results, plain-language explanations, no account required.',
  path: '/tools/domain-check',
});

// Hero eyebrow/h1 and the result-card framing are matched against the source design artifact
// (KS-LLC/build-sas-products-ideas/1. WarmHawk B2B/warmhawk-full-prototype.html `#page-domain-check`,
// lines 684-712) — its eyebrow, exact h1 ("Check any sending domain's deliverability setup,
// free."), and closing line ("See this monitored continuously for all your sending domains, with
// alerts the moment something changes.") are carried over close to verbatim. The one deliberate
// departure: the artifact's result card is a static mockup with five pre-filled rows, including a
// "WEAK POLICY" amber state for DMARC — this page instead calls core-engine's real
// `GET /public/domain-check` endpoint (see components/DomainCheckTool.tsx), which only ever
// returns PASS/FAIL for SPF/DKIM/DMARC (no policy-strength gradient) and a plain explanatory
// string for List-Unsubscribe rather than a checkable status, so the UI reflects the real API
// contract instead of the mockup's fabricated "WEAK POLICY" badge.

const faqItems = [
  {
    question: 'What is SPF/DKIM/DMARC and why do they matter?',
    answer:
      'SPF, DKIM, and DMARC are the three DNS records receiving mail servers check to decide whether your email is legitimate. SPF authorizes sending servers, DKIM signs messages so they can’t be tampered with, and DMARC tells receivers what to do when the first two fail. Missing or misconfigured records are one of the most common reasons cold email lands in spam.',
  },
  {
    question: 'What is RFC 8058 List-Unsubscribe and why does Gmail care about it?',
    answer:
      'RFC 8058 defines a one-click unsubscribe header that lets a mailbox provider unsubscribe a recipient with a single request, no login or landing page required. As of November 2025, Gmail and Yahoo escalated enforcement from throttling to outright rejecting bulk mail that lacks it, so this is no longer optional for any sender at volume.',
  },
  {
    question: 'How often should I check my sending domain?',
    answer:
      'DNS records and blocklist status can change without any action on your part — a DKIM key rotation, a DNS provider migration, or a single spam complaint can knock a domain out of compliance overnight. Check before starting any new sending domain, and re-check anytime deliverability drops unexpectedly.',
  },
  {
    question: 'Is this the same check WarmHawk runs continuously for paying customers?',
    answer:
      'Yes — same underlying SPF/DKIM/DMARC/List-Unsubscribe/blocklist logic. The difference is that this free tool gives you a one-time snapshot, while the paid WarmHawk dashboard runs the identical checks continuously against every sending domain you own and alerts you the moment one starts failing.',
  },
];

export default function DomainCheckPage() {
  return (
    <>
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            SPF/DKIM/DMARC checker · List-Unsubscribe checker · blocklist check
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check any sending domain&rsquo;s deliverability setup, free.
          </h1>
          <AnswerBlock>
            Paste a domain to see live SPF, DKIM, and DMARC status, whether it has a working RFC
            8058 one-click List-Unsubscribe header, and its current blocklist standing — the same
            checks WarmHawk runs continuously on every domain inside the paid dashboard, exposed
            here as a free public tool, with a plain-language explanation of what each check
            actually means.
          </AnswerBlock>
          <p className="text-base leading-relaxed text-ink-muted">
            As of November 2025,{' '}
            <StatCite source="Gmail/Yahoo bulk-sender requirements, 2024-2026">
              Gmail escalated its non-compliant bulk-sender enforcement from throttling to
              permanent rejection for senders missing one-click unsubscribe headers
            </StatCite>
            . A domain that passed this same check a year ago can silently fail it today.
          </p>
        </div>
      </div>

      <div className="wrap pb-16 md:pb-20">
        <DomainCheckTool />
      </div>

      <FaqSection items={faqItems} title="SPF, DKIM, DMARC & List-Unsubscribe FAQ" />
    </>
  );
}
