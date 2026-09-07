import type { Metadata } from 'next';
import { pageSeo, webApplicationSchema } from '@/lib/seo';
import { dmarcCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// One of 5 check-specific landing pages sharing the one bulk checker + the one proxy route with
// /tools/domain-check — see notes/1-plan/domain-check-seo-landing-pages.md. This page leads with
// DMARC (via DomainCheckTool's `leadCheck` prop) but still runs, and shows, all 5 checks.

const TOOL_NAME = 'Free DMARC Checker';
const TOOL_DESCRIPTION =
  "Check any domain's DMARC policy free — none, quarantine, or reject — plus MX, SPF, DKIM and blocklist status. No account required.";

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/dmarc-checker',
});

export default function DmarcCheckerPage() {
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
              path: '/tools/dmarc-checker',
            }),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">DMARC Checker · plus MX, SPF, DKIM &amp; blacklist</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check your DMARC policy &mdash; none, quarantine, or reject.
          </h1>
          <AnswerBlock>
            DMARC tells receivers what to do when a message fails SPF or DKIM, and reports
            spoofing attempts back to you. A policy of p=none is a real, published record that
            explicitly asks receivers to take no action on failure &mdash; a common default
            that&rsquo;s easy to mistake for protection. Paste up to 15 domains below to see each
            one&rsquo;s exact policy, reporting address, and 4 more checks.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-10">
        <DomainCheckTool leadCheck="dmarc" />
      </div>

      <ToolCrossLinks current="/tools/dmarc-checker" />

      <FaqSection items={dmarcCheckFaqItems} title="DMARC Checker FAQ" />
    </>
  );
}
