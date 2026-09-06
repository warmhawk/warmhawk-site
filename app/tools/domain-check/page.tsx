import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { domainCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';

export const metadata: Metadata = pageSeo({
  title: 'Free Bulk SPF, DKIM & DMARC Checker + List-Unsubscribe Guide',
  description:
    'Check up to 15 sending domains at once — MX, SPF, DKIM, DMARC and blocklist status, 5 checks each — plus a plain-language guide to the RFC 8058 List-Unsubscribe requirement. No account required.',
  path: '/tools/domain-check',
});

// Hero eyebrow/h1 and the result-card framing are matched against the source design artifact
// (warmhawk-full-prototype.html `#page-domain-check`, lines 684-712) — its eyebrow and closing
// line ("See this monitored continuously for all your sending domains, with alerts the moment
// something changes.") are carried over close to verbatim.
//
// The tool is a BULK checker: up to 15 domains, 5 checks each (MX, SPF, DKIM, DMARC, blocklist).
// The unit vocabulary matters and the copy must never blur it — "15 domains", "5 checks each",
// "12 of 10 DNS lookups". The 15 is ours and tunable; the 10 is RFC 7208's and is not.
//
// The artifact's mockup included a "WEAK POLICY" amber state for DMARC. That is now real rather
// than fabricated: the probe returns four statuses, and `warn` is exactly this case — a p=none
// policy is a published rule that asks receivers to do nothing, which is a finding but not a
// failure. The fourth, `unknown`, exists because some checks genuinely cannot be answered (see
// components/CheckBadge.tsx), and rendering those as either pass or fail would be a lie.
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
            Bulk SPF/DKIM/DMARC checker · blocklist check · List-Unsubscribe guide
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check every sending domain&rsquo;s deliverability setup, free.
          </h1>
          <AnswerBlock>
            Paste up to 15 domains to see live MX, SPF, DKIM, DMARC and blocklist status &mdash; 5
            checks each &mdash; the same DNS checks WarmHawk runs continuously on every domain
            inside the paid dashboard, exposed here as a free public tool. The SPF check also
            counts what the record costs against the limit of 10 DNS lookups RFC 7208 sets, which
            is the usual reason a record that looks fine has quietly stopped working. It also
            explains the RFC 8058 one-click List-Unsubscribe requirement, though that one
            can&rsquo;t be verified from a bare domain — it lives on your sent messages, not in
            DNS, so connect the domain inside WarmHawk to check it on real sends.
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
