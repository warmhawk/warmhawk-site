import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbSchema, pageSeo, webApplicationSchema } from '@/lib/seo';
import {
  ERRORS_VERIFIED_ON,
  errorCategoryLabels,
  smtpErrors,
  type ErrorCategory,
} from '@/lib/smtpErrors';
import { AnswerBlock } from '@/components/AnswerBlock';
import { BounceDecoder } from '@/components/BounceDecoder';
import { FaqSection } from '@/components/FaqSchema';
import { ToolCrossLinks } from '@/components/ToolCrossLinks';

const TITLE = 'Email Bounce Codes Decoded: SMTP Error Lookup';
const DESCRIPTION =
  'Paste any bounce message to decode its SMTP error code, then read the fix. Covers Gmail and Microsoft 365 codes like 5.7.26, 5.7.708, 5.7.509 and 4.7.28, quoted from official docs.';

export const metadata: Metadata = pageSeo({
  title: TITLE,
  description: DESCRIPTION,
  path: '/errors',
});

const CATEGORY_ORDER: ErrorCategory[] = [
  'authentication',
  'reputation',
  'rate-limit',
  'recipient',
  'account',
  'transport',
];

const faqItems = [
  {
    question: 'What is the difference between a 4xx and a 5xx bounce?',
    answer:
      'A reply starting with 4 (such as 421 4.7.28) is a temporary failure: the sending server keeps the message and retries for a while, usually up to a few days. A reply starting with 5 (such as 550 5.7.26) is permanent: the message will not be retried, and resending unchanged will fail again.',
  },
  {
    question: 'What is an enhanced status code?',
    answer:
      'It is the three-part code such as 5.7.26 that follows the three-digit SMTP reply. RFC 3463 defines the structure: the first digit is the class (4 temporary, 5 permanent), the second is the subject (1 addressing, 2 mailbox, 4 routing, 7 security and policy), and the third is the specific detail. Providers add their own detail numbers on top.',
  },
  {
    question: 'Where do I find the code in a bounce message?',
    answer:
      'Open the bounce (it usually comes from "Mail Delivery Subsystem" or "Microsoft Outlook") and look near the top for the remote server’s reply. Gmail bounces show lines like "550-5.7.26"; Microsoft 365 bounces show "Remote server returned …" followed by the code. Pasting the whole bounce into the decoder above works too.',
  },
  {
    question: 'Is my bounce message uploaded when I use the decoder?',
    answer:
      'No. The decoder runs entirely in your browser. The text you paste is never sent to WarmHawk or anyone else.',
  },
  {
    question: 'Where do these error messages come from?',
    answer: `Every message on these pages is quoted from the provider’s own documentation: Google’s Gmail SMTP errors and codes, Microsoft Learn’s Exchange Online NDR reference, Microsoft Support for Outlook.com, and RFC 3463 for the standard meanings. They were last checked on ${ERRORS_VERIFIED_ON}, and each page links its sources.`,
  },
];

export default function ErrorsHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            webApplicationSchema({
              name: 'Bounce Message Decoder',
              description: DESCRIPTION,
              path: '/errors',
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Bounce error codes', path: '/errors' },
            ]),
          ]),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            Bounce decoder · {smtpErrors.length} Gmail &amp; Microsoft codes
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            What does your bounce message actually mean?
          </h1>
          <AnswerBlock>
            A bounce message carries an SMTP reply such as 550 5.7.26 or 421 4.7.28. The first digit
            says whether it is permanent (5) or temporary (4); the rest says why. Paste your bounce
            below to decode it, then follow the fix, with every message quoted from Google or
            Microsoft&rsquo;s own documentation.
          </AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-12 max-w-4xl">
        <BounceDecoder />
      </div>

      <div className="wrap pb-12">
        <h2 className="font-display text-2xl font-semibold mb-6">All bounce codes by cause</h2>
        <div className="grid gap-10 md:grid-cols-2">
          {CATEGORY_ORDER.map((category) => {
            const entries = smtpErrors.filter((entry) => entry.category === category);
            return (
              <section key={category}>
                <h3 className="label text-rust mb-3">{errorCategoryLabels[category]}</h3>
                <ul className="border-t border-border">
                  {entries.map((entry) => (
                    <li key={entry.slug} className="border-b border-border">
                      <Link
                        href={`/errors/${entry.slug}`}
                        className="flex items-baseline gap-3 py-3 hover:text-rust"
                      >
                        <span className="font-mono text-sm text-rust w-[88px] flex-none">
                          {entry.ranges ? `${entry.code}+` : entry.code}
                        </span>
                        <span className="text-[15px] text-ink">{entry.headline}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <ToolCrossLinks current="/errors" />

      <FaqSection items={faqItems} title="Bounce code questions" />
    </>
  );
}
