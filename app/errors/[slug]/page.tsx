import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { breadcrumbSchema, pageSeo } from '@/lib/seo';
import {
  ERRORS_VERIFIED_ON,
  checkerLinks,
  errorProviderLabels,
  getSmtpError,
  smtpErrors,
  warmhawkGuardrails,
  type SmtpErrorEntry,
} from '@/lib/smtpErrors';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';

// One static page per lib/smtpErrors.ts entry. Adding a code there adds its page, its sitemap
// entry (app/sitemap.ts) and its hub listing — nothing to hand-wire here.

export const dynamicParams = false;

export function generateStaticParams() {
  return smtpErrors.map((entry) => ({ slug: entry.slug }));
}

type Params = Promise<{ slug: string }>;

/** "550 5.7.26" when every documented variant shares one reply, else just "5.7.26". */
function titleCode(entry: SmtpErrorEntry): string {
  const permanentReply = entry.variants.find(
    (variant) => variant.reply.endsWith(` ${entry.code}`) && variant.reply[0] === entry.code[0],
  );
  if (entry.ranges) return `${entry.code}–${entry.ranges[0]?.[1]}`;
  return permanentReply ? permanentReply.reply : entry.code;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const entry = getSmtpError((await params).slug);
  if (!entry) return {};
  const description =
    entry.summary.length > 158
      ? `${entry.summary.slice(0, 155).replace(/\s+\S*$/, '')}…`
      : entry.summary;
  return pageSeo({
    title: `${titleCode(entry)} Error: ${entry.headline}`,
    description,
    path: `/errors/${entry.slug}`,
  });
}

export default async function SmtpErrorPage({ params }: { params: Params }) {
  const entry = getSmtpError((await params).slug);
  if (!entry) notFound();

  const path = `/errors/${entry.slug}`;
  const related = entry.related
    .map((slug) => getSmtpError(slug))
    .filter((item): item is SmtpErrorEntry => item !== undefined);
  const otherCodes = [
    ...entry.aliases,
    ...(entry.ranges ?? []).map(([low, high]) => `${low}–${high}`),
  ];

  const faqItems = [
    {
      question: `What does ${entry.code} mean?`,
      answer: entry.summary,
    },
    {
      question: `Is ${entry.code} a temporary or permanent error?`,
      answer:
        entry.permanence === 'both'
          ? `Both forms exist. A reply starting with 4 (such as ${entry.aliases[0] ?? entry.code}) is temporary, and the sending server will retry; a reply starting with 5 is permanent, and the message will not be retried until you fix the cause.`
          : entry.permanence === 'temporary'
            ? 'Temporary. The sending server keeps the message and retries it for a while. It only becomes a bounce if every retry fails before the message expires.'
            : 'Permanent. The message will not be retried, and sending it again unchanged will fail the same way until the cause is fixed.',
    },
    {
      question: `How do I fix ${entry.code}?`,
      answer: entry.fixes.join(' '),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Bounce error codes', path: '/errors' },
              { name: entry.code, path },
            ]),
          ),
        }}
      />
      <div className="wrap pt-16 md:pt-24 pb-6">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">
            <Link href="/errors" className="hover:underline">
              Bounce codes
            </Link>{' '}
            &middot;{' '}
            {entry.permanence === 'both'
              ? 'Temporary or permanent'
              : entry.permanence === 'temporary'
                ? 'Temporary'
                : 'Permanent'}
            {otherCodes.length > 0 ? ` · also ${otherCodes.join(', ')}` : ''}
          </div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            {titleCode(entry)}: {entry.headline}
          </h1>
          <AnswerBlock>{entry.summary}</AnswerBlock>
        </div>
      </div>

      <div className="wrap pb-6 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold mb-4 mt-6">
          The exact message{entry.variants.length > 1 ? 's' : ''}
        </h2>
        <div className="space-y-3">
          {entry.variants.map((variant) => (
            <div key={`${variant.reply}:${variant.text}`} className="card bg-cream-elevated p-5">
              <p className="label text-ink-muted mb-2">{errorProviderLabels[variant.provider]}</p>
              <p className="font-mono text-[13.5px] leading-relaxed text-ink">
                {variant.reply} {variant.text}
              </p>
            </div>
          ))}
        </div>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Why it happens</h2>
        <ul className="list-disc pl-5 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl">
          {entry.causes.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">How to fix it</h2>
        <ol className="list-decimal pl-5 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl">
          {entry.fixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ol>

        {entry.experience && (
          <div className="card bg-cream-elevated p-7 max-w-2xl mt-10">
            <p className="label text-rust mb-2">Real experience</p>
            <h2 className="font-display text-xl font-semibold mb-3">{entry.experience.title}</h2>
            <div className="space-y-3 text-[15px] leading-relaxed text-ink-muted">
              {entry.experience.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">If you send cold email</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl">{entry.coldEmail}</p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">How WarmHawk handles it</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl">
          {warmhawkGuardrails[entry.category]}{' '}
          <Link href="/" className="text-rust font-semibold">
            How WarmHawk works &rarr;
          </Link>
        </p>

        {entry.checks.length > 0 && (
          <div className="card bg-cream-elevated p-7 max-w-2xl mt-10">
            <h2 className="font-display text-xl font-semibold mb-3">Check your domain now</h2>
            <p className="text-[15px] text-ink-muted mb-4">
              These free checkers read your live DNS: no account, up to 15 domains at once.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {entry.checks.map((key) => (
                <Link
                  key={key}
                  href={checkerLinks[key].href}
                  className="rounded-full border-[1.5px] border-rust px-3 py-1.5 font-semibold text-rust hover:bg-rust-tint"
                >
                  {checkerLinks[key].label} &rarr;
                </Link>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Related bounce codes</h2>
            <ul className="border-t border-border max-w-2xl">
              {related.map((item) => (
                <li key={item.slug} className="border-b border-border">
                  <Link
                    href={`/errors/${item.slug}`}
                    className="flex items-baseline gap-3 py-3 hover:text-rust"
                  >
                    <span className="font-mono text-sm text-rust w-[88px] flex-none">
                      {item.code}
                    </span>
                    <span className="text-[15px] text-ink">{item.headline}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-[13px] text-ink-muted mt-10 max-w-2xl">
          Sources, checked {ERRORS_VERIFIED_ON}:{' '}
          {entry.sources.map((source, i) => (
            <span key={source.url}>
              {i > 0 ? ' · ' : ''}
              <a href={source.url} className="underline" rel="noopener" target="_blank">
                {source.label}
              </a>
            </span>
          ))}
          . Have a different bounce?{' '}
          <Link href="/errors" className="text-rust font-semibold">
            Paste it into the decoder &rarr;
          </Link>
        </p>
      </div>

      <FaqSection items={faqItems} title={`${entry.code} questions`} />
    </>
  );
}
