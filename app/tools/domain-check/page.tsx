import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { domainCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';

export const metadata: Metadata = pageSeo({
  title: 'Free SPF, DKIM & DMARC Checker + List-Unsubscribe Guide',
  description:
    'Free SPF/DKIM/DMARC checker and blocklist lookup for any sending domain, with a plain-language guide to the RFC 8058 List-Unsubscribe requirement. Instant PASS/FAIL results on the DNS checks, no account required.',
  path: '/tools/domain-check',
});

// Hero eyebrow/h1 and the result-card framing are matched against the source design artifact
// (warmhawk-full-prototype.html `#page-domain-check`,
// lines 684-712) — its eyebrow, exact h1 ("Check any sending domain's deliverability setup,
// free."), and closing line ("See this monitored continuously for all your sending domains, with
// alerts the moment something changes.") are carried over close to verbatim. The one deliberate
// departure: the artifact's result card is a static mockup with five pre-filled rows, including a
// "WEAK POLICY" amber state for DMARC — this page instead calls core-engine's real
// `GET /public/domain-check` endpoint (see components/DomainCheckTool.tsx), which only ever
// returns PASS/FAIL for SPF/DKIM/DMARC (no policy-strength gradient) and a plain explanatory
// string for List-Unsubscribe rather than a checkable status, so the UI reflects the real API
// contract instead of the mockup's fabricated "WEAK POLICY" badge.
//
// Copy audit (2026-09-03): the title/meta/hero used to claim this tool checks "whether [a domain]
// has a working RFC 8058 ... header" — verified against the actual endpoint and found false. RFC
// 8058's List-Unsubscribe/List-Unsubscribe-Post are headers on a SENT message, not a DNS record,
// so there is structurally nothing to check for a bare domain string (see
// publicDomainCheckRoutes's own doc comment in warmhawk-core-engine, and DomainCheckTool.tsx's
// "INFO" badge, never PASS/FAIL, for this row). Copy below now only claims a check for the three
// things that are actually DNS-checkable — SPF, DKIM, DMARC — plus blocklist status, and treats
// List-Unsubscribe as what it is: an explanation of a requirement, not a checkable result.

export default function DomainCheckPage() {
  return (
    <>
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            SPF/DKIM/DMARC checker · blocklist check · List-Unsubscribe guide
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check any sending domain&rsquo;s deliverability setup, free.
          </h1>
          <AnswerBlock>
            Paste a domain to see live SPF, DKIM, and DMARC status and its current blocklist
            standing — the same DNS checks WarmHawk runs continuously on every domain inside the
            paid dashboard, exposed here as a free public tool. It also explains the RFC 8058
            one-click List-Unsubscribe requirement, though that one can&rsquo;t be verified from a
            bare domain — it lives on your sent messages, not in DNS, so connect the domain inside
            WarmHawk to check it on real sends.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-16 md:pb-20">
        <DomainCheckTool />
      </div>

      <FaqSection items={domainCheckFaqItems} title="SPF, DKIM, DMARC & List-Unsubscribe FAQ" />
    </>
  );
}
