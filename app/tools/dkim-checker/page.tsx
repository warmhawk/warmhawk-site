import type { Metadata } from 'next';
import { pageSeo, webApplicationSchema } from '@/lib/seo';
import { dkimCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// One of 5 check-specific landing pages sharing the one bulk checker + the one proxy route with
// /tools/domain-check — see notes/1-plan/domain-check-seo-landing-pages.md. This page leads with
// DKIM (via DomainCheckTool's `leadCheck` prop) but still runs, and shows, all 5 checks.

const TOOL_NAME = 'Free DKIM Checker';
const TOOL_DESCRIPTION =
  "Check whether a domain's DKIM key is published and valid, free — plus MX, SPF, DMARC and blocklist status in the same lookup. No account required.";

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/dkim-checker',
});

export default function DkimCheckerPage() {
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
              path: '/tools/dkim-checker',
            }),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            DKIM Checker · plus MX, SPF, DMARC &amp; blacklist
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check whether DKIM is signing your mail.
          </h1>
          <AnswerBlock>
            DKIM signs your outgoing mail with a private key so receivers can confirm it
            wasn&rsquo;t altered in transit. Selectors can&rsquo;t be enumerated from DNS, so this
            check tries a set of common selector names &mdash; a miss means we couldn&rsquo;t find a
            key under those names, not that DKIM is definitely missing. Paste up to 15 domains
            below, and see DKIM alongside 4 more checks.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-10">
        <DomainCheckTool leadCheck="dkim" />
      </div>

      <ToolCrossLinks current="/tools/dkim-checker" />

      <FaqSection items={dkimCheckFaqItems} title="DKIM Checker FAQ" />
    </>
  );
}
