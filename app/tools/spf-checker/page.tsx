import type { Metadata } from 'next';
import { pageSeo, webApplicationSchema } from '@/lib/seo';
import { spfCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// One of 5 check-specific landing pages sharing the one bulk checker + the one proxy route with
// /tools/domain-check — see notes/1-plan/domain-check-seo-landing-pages.md. This page leads with
// SPF (via DomainCheckTool's `leadCheck` prop) but still runs, and shows, all 5 checks.

const TOOL_NAME = 'Free SPF Record Checker';
const TOOL_DESCRIPTION =
  "Check any domain's SPF record free — see its exact DNS lookup count against RFC 7208's limit of 10, plus MX, DKIM, DMARC and blocklist status. No account required.";

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/spf-checker',
});

export default function SpfCheckerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webApplicationSchema({
              name: TOOL_NAME,
              description: TOOL_DESCRIPTION,
              path: '/tools/spf-checker',
            }),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            SPF Record Checker · plus MX, DKIM, DMARC &amp; blacklist
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check your SPF record &mdash; and its 10-lookup budget.
          </h1>
          <AnswerBlock>
            SPF lists which servers may send mail for your domain, and RFC 7208 caps it at exactly
            10 DNS lookups &mdash; go over, and receivers stop honoring the record entirely,
            silently. Paste up to 15 domains below to see your live SPF record, its exact lookup
            count against that ceiling, and 4 more checks alongside it.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-10">
        <DomainCheckTool leadCheck="spf" />
      </div>

      <ToolCrossLinks current="/tools/spf-checker" />

      <FaqSection items={spfCheckFaqItems} title="SPF Record Checker FAQ" />
    </>
  );
}
