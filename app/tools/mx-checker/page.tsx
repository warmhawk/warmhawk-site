import type { Metadata } from 'next';
import { pageSeo, webApplicationSchema } from '@/lib/seo';
import { mxCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// One of 5 check-specific landing pages sharing the one bulk checker + the one proxy route with
// /tools/domain-check — see notes/1-plan/domain-check-seo-landing-pages.md. This page leads with
// MX (via DomainCheckTool's `leadCheck` prop) but still runs, and shows, all 5 checks.

const TOOL_NAME = 'Free MX Record Checker';
const TOOL_DESCRIPTION =
  "Check any domain's MX record free — see where inbound mail is routed, plus SPF, DKIM, DMARC and blocklist status in the same lookup. No account required.";

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/mx-checker',
});

export default function MxCheckerPage() {
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
              path: '/tools/mx-checker',
            }),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">MX Record Checker · plus SPF, DKIM, DMARC &amp; blacklist</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check your MX record &mdash; free, no account.
          </h1>
          <AnswerBlock>
            Your MX record tells the internet where your domain&rsquo;s inbound mail gets
            delivered. A missing MX record doesn&rsquo;t stop you from sending &mdash; only from
            receiving &mdash; but it&rsquo;s often the first sign a domain was set up for
            outbound-only sending. Paste up to 15 domains below to see live MX status, plus the 4
            other checks WarmHawk runs continuously in the paid dashboard.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-10">
        <DomainCheckTool leadCheck="mx" />
      </div>

      <ToolCrossLinks current="/tools/mx-checker" />

      <FaqSection items={mxCheckFaqItems} title="MX Record Checker FAQ" />
    </>
  );
}
