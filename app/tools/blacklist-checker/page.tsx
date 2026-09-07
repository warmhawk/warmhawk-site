import type { Metadata } from 'next';
import { pageSeo, webApplicationSchema } from '@/lib/seo';
import { blacklistCheckFaqItems } from '@/lib/faqContent';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { DomainCheckTool } from '@/components/DomainCheckTool';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

// One of 5 check-specific landing pages sharing the one bulk checker + the one proxy route with
// /tools/domain-check — see notes/1-plan/domain-check-seo-landing-pages.md. This page leads with
// the blocklist check (via DomainCheckTool's `leadCheck="bl"` prop) but still runs, and shows,
// all 5 checks.
//
// Naming split, deliberate (plan Section 4): this route's URL/title/meta/h1 say "blacklist" —
// that's the word people actually search. Everywhere else (the `bl` check id, CheckBadge labels,
// the "Blocklist" column title inside DomainCheckTool) stays "blocklist" — do not "fix" that.

const TOOL_NAME = 'Free Email Blacklist Checker';
const TOOL_DESCRIPTION =
  'Check if a sending domain is on the Spamhaus email blacklist, free — plus MX, SPF, DKIM and DMARC status in the same lookup. No account required.';

export const metadata: Metadata = pageSeo({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: '/tools/blacklist-checker',
});

export default function BlacklistCheckerPage() {
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
              path: '/tools/blacklist-checker',
            }),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">Email Blacklist Checker · plus MX, SPF, DKIM &amp; DMARC</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Check if your domain is on an email blacklist.
          </h1>
          <AnswerBlock>
            This checks your sending domain &mdash; and any sending addresses your own SPF
            record declares &mdash; against the Spamhaus domain blocklist. We deliberately never
            judge your reputation by your website&rsquo;s IP address, a different, unrelated
            signal. Paste up to 15 domains below to see live blacklist status alongside 4 more
            checks.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-10">
        <DomainCheckTool leadCheck="bl" />
      </div>

      <ToolCrossLinks current="/tools/blacklist-checker" />

      <FaqSection items={blacklistCheckFaqItems} title="Email Blacklist Checker FAQ" />
    </>
  );
}
