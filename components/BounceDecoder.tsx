'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { decodeBounce, type DecodeResult } from '@/lib/bounceDecoder';
import { checkerLinks, errorProviderLabels } from '@/lib/smtpErrors';
import { EVENTS, track } from '@/lib/analytics';

const EXAMPLE = `550-5.7.26 This email has been blocked because the sender is unauthenticated.
550-5.7.26 Gmail requires all senders to authenticate with either SPF or DKIM.
550 5.7.26 https://support.google.com/mail/answer/81126 - gsmtp`;

/**
 * "Paste your bounce message" — decodes entirely in the browser via lib/bounceDecoder.ts. The
 * pasted text is never sent anywhere; analytics records only which dictionary codes matched.
 */
export function BounceDecoder() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<DecodeResult | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const decoded = decodeBounce(input);
    setResult(decoded);
    track(EVENTS.bounceDecodeRun, {
      matched: decoded.matches.map((match) => match.entry.code).join(',') || null,
      provider: decoded.provider,
      unknown: decoded.unknownCodes.length,
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="kicker-card">
        <div className="field">
          <label htmlFor="bounce-input">
            Paste the bounce message
            <span className="font-normal text-ink-muted text-[12.5px]">
              {' '}
              &mdash; the whole thing is fine. It&rsquo;s decoded in your browser and never
              uploaded.
            </span>
          </label>
          <textarea
            id="bounce-input"
            rows={6}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={EXAMPLE}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={input.trim() === ''}
            className="btn btn-primary disabled:opacity-50"
          >
            Decode bounce
          </button>
          <button
            type="button"
            onClick={() => {
              setInput(EXAMPLE);
              setResult(decodeBounce(EXAMPLE));
            }}
            className="text-sm text-rust font-semibold"
          >
            Try an example
          </button>
        </div>
      </form>

      {result && <DecodeResultView result={result} />}
    </div>
  );
}

function DecodeResultView({ result }: { result: DecodeResult }) {
  if (result.matches.length === 0) {
    return (
      <div className="card mt-6 p-6 bg-cream" role="status">
        <p className="font-display text-lg font-semibold mb-2">
          {result.unknownCodes.length > 0
            ? `Found ${result.unknownCodes.join(', ')}, which isn’t in this dictionary yet.`
            : 'No SMTP status code found in that text.'}
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl">
          {result.permanence === 'temporary'
            ? 'It starts with 4, so it is a temporary failure: the sending server will keep retrying for a while. '
            : result.permanence === 'permanent'
              ? 'It starts with 5, so it is a permanent failure: the message will not be retried. '
              : 'Look for a code shaped like 550 5.7.26 or 421 4.7.28 near the top of the bounce. '}
          Browse the codes below, or run a full domain check to rule out SPF, DKIM, DMARC and
          blocklist problems.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4" role="status">
      {result.matches.map(({ code, entry, variant, matchedBy }) => (
        <div key={entry.slug} className="kicker-card">
          <p className="label text-rust mb-2">
            {variant ? variant.reply : code}
            {' · '}
            {entry.permanence === 'temporary'
              ? 'Temporary'
              : entry.permanence === 'permanent'
                ? 'Permanent'
                : result.permanence === 'temporary'
                  ? 'Temporary'
                  : 'Permanent'}
            {variant ? ` · ${errorProviderLabels[variant.provider]}` : ''}
            {matchedBy === 'text' ? ' · matched by wording' : ''}
          </p>
          <h3 className="font-display text-xl font-semibold mb-2">{entry.headline}</h3>
          {variant && (
            <p className="font-mono text-[13px] text-ink-muted mb-3">
              &ldquo;{variant.text}&rdquo;
            </p>
          )}
          <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
            {entry.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/errors/${entry.slug}`} className="btn btn-primary">
              How to fix {entry.code} &rarr;
            </Link>
            {entry.checks.slice(0, 2).map((key) => (
              <Link
                key={key}
                href={checkerLinks[key].href}
                className="rounded-full border-[1.5px] border-border-dark px-3 py-1.5 font-medium text-ink hover:bg-ink/5"
              >
                {checkerLinks[key].label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
