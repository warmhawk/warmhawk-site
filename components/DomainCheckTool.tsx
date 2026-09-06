'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckBadge, type CheckStatus } from '@/components/CheckBadge';
import { normalise, type Rejection } from '@/lib/domainInput';
import { useTurnstile } from '@/components/useTurnstile';

/**
 * The bulk domain checker.
 *
 * 🔤 **The unit vocabulary, which the copy must never blur.** Three quantities live in this UI and
 * two of them used to both be "10":
 *
 * | Noun | Meaning | Bound |
 * |---|---|---|
 * | domain | a hostname the visitor pastes | max **15** — ours, tunable |
 * | check | one of the five run per domain | exactly **5**, always |
 * | DNS lookup | what evaluating an SPF record costs | max **10** — RFC 7208, *not ours* |
 *
 * So: "15 domains", "5 checks each", "12 of 10 DNS lookups". Never "up to 10".
 *
 * 📌 **List-Unsubscribe is deliberately not a sixth check.** RFC 8058 headers live on a sent
 * message, not in DNS, so there is structurally nothing to check for a bare domain. Excluding it
 * is what lets "5 checks each" be literally true. The FAQ explains it as a requirement; this
 * component never reports a status for it.
 *
 * 🔒 **Every string below is authored here, in the client.** The API returns only
 * `{id, status, label, facts}` — no HTML, no prose. DNS-sourced values are attacker-controlled and
 * reach the DOM only through JSX interpolation; there is no `dangerouslySetInnerHTML` in this file
 * and there must never be one.
 */

const CHECK_IDS = ['mx', 'spf', 'dkim', 'dmarc', 'bl'] as const;
type CheckId = (typeof CHECK_IDS)[number];

type ApiStatus = 'pass' | 'warn' | 'fail' | 'unknown';

interface ApiCheck {
  id: CheckId;
  status: ApiStatus;
  label: string;
  facts?: Record<string, unknown>;
}

interface DomainResult {
  domain: string;
  checks: ApiCheck[];
}

interface Meta {
  submitted: number;
  deduplicated: number;
  fresh: number;
  cached: number;
  rejected: Rejection[];
  truncated: boolean;
  overCap: number;
}

interface ApiResponse {
  results: DomainResult[];
  meta: Meta;
}

type ToolState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; data: ApiResponse };

const MAX_DOMAINS = 15;

const COLUMNS: { id: CheckId; title: string; explain: string }[] = [
  {
    id: 'mx',
    title: 'MX',
    explain:
      'MX records say where your inbound mail is delivered. A domain with no MX can still send perfectly well, so this is a warning rather than a failure.',
  },
  {
    id: 'spf',
    title: 'SPF',
    explain:
      'SPF lists which servers may send for your domain. It is also capped at 10 DNS lookups by RFC 7208 — go over and receivers stop honouring the record entirely, silently.',
  },
  {
    id: 'dkim',
    title: 'DKIM',
    explain:
      'DKIM signs your outgoing mail so receivers can confirm it was not altered. Selectors cannot be listed from DNS, so we try nine common ones — a miss means we could not find it, not that it is missing.',
  },
  {
    id: 'dmarc',
    title: 'DMARC',
    explain:
      'DMARC tells receivers what to do when SPF or DKIM fails, and reports spoofing back to you. A p=none policy publishes a rule that asks receivers to do nothing.',
  },
  {
    id: 'bl',
    title: 'Blocklist',
    explain:
      'Your domain against the Spamhaus domain blocklist, plus any sending addresses your own SPF record declares. We never judge your reputation by your website’s IP address.',
  },
];

/**
 * The sentence shown for each result.
 *
 * Authored from the machine-readable `label`, never from anything the API sends as prose. An
 * unrecognised label falls back to a neutral phrasing rather than rendering the raw token at the
 * visitor — a label is an internal identifier, not copy.
 */
const SENTENCES: Record<string, string> = {
  'mx-present': 'Inbound mail is routed.',
  'mx-none': 'No MX records. This domain receives no mail — it can still send.',
  'mx-null':
    'A null MX record, which declares that this domain accepts no mail at all. It can still send.',
  'mx-lookup-failed': 'We could not read the MX records just now.',

  'spf-ok': 'A valid SPF record, within the lookup limit.',
  'spf-none': 'No SPF record. Receivers cannot tell which servers may send for you.',
  'spf-multiple-records':
    'Two or more SPF records. Receivers treat this as an error and ignore both.',
  'spf-lookup-limit-exceeded':
    'This SPF record needs more than the 10 DNS lookups RFC 7208 allows, so receivers stop honouring it.',
  'spf-void-limit-exceeded':
    'Too many SPF lookups resolve to nothing, which receivers treat as an error.',
  'spf-all-permissive': 'The record ends in +all, which authorises anyone to send as your domain.',
  'spf-all-neutral': 'The record ends in ?all, which authorises nothing in particular.',
  'spf-no-all':
    'The record has no all mechanism, so it never says what to do with unlisted senders.',
  'spf-syntax-error': 'This SPF record could not be parsed.',
  'spf-lookup-failed': 'We could not read the SPF record just now.',

  'dkim-found': 'A DKIM key is published.',
  'dkim-selector-not-found':
    'No key found under nine common selector names. Selectors cannot be listed from DNS, so yours may simply use a different name.',
  'dkim-supplied-selector-not-found': 'No DKIM key published under the selector you gave.',
  'dkim-selector-revoked':
    'A key is published under a common selector name, but it has been revoked and signs nothing. Yours may use a different selector.',
  'dkim-supplied-selector-revoked':
    'The DKIM key published under the selector you gave has been revoked, so it verifies nothing.',
  'dkim-lookup-failed': 'We could not read the DKIM records just now.',

  'dmarc-enforcing': 'An enforcing DMARC policy with reporting.',
  'dmarc-policy-none': 'The policy is p=none, which asks receivers to take no action.',
  'dmarc-no-reporting': 'Enforcing, but with no rua address, so spoofing is never reported to you.',
  'dmarc-none': 'No DMARC record.',
  'dmarc-multiple-records': 'More than one DMARC record, which receivers treat as an error.',
  'dmarc-lookup-failed': 'We could not read the DMARC record just now.',

  'bl-not-listed': 'Not listed.',
  'bl-domain-listed': 'This domain appears on the Spamhaus domain blocklist.',
  'bl-ip-listed': 'A sending address declared in your SPF record is listed.',
  'bl-query-refused': 'The blocklist did not answer our query, so we cannot say either way.',

  'ns-ceiling-throttled': 'We are querying this domain’s nameservers too often. Try again shortly.',
  'breaker-cache-only': 'We are serving cached answers right now. Try again shortly.',
  'deadline-exceeded': 'This one took too long to answer.',
  'result-missing': 'No result came back for this domain.',
};

function sentenceFor(check: ApiCheck): string {
  return SENTENCES[check.label] ?? 'We could not determine this one.';
}

/** The probe's statuses map 1:1 onto the badge's. Anything unrecognised is `unknown`, not `pass`. */
function toBadgeStatus(status: ApiStatus): CheckStatus {
  return status === 'pass' || status === 'warn' || status === 'fail' ? status : 'unknown';
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.results)) return false;
  return record.results.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const result = entry as Record<string, unknown>;
    if (typeof result.domain !== 'string') return false;
    if (!Array.isArray(result.checks)) return false;
    // Five rows, always — a missing row would silently shift the matrix columns.
    return (
      result.checks.length === CHECK_IDS.length &&
      result.checks.every((c) => {
        const check = c as Record<string, unknown>;
        return typeof check.id === 'string' && typeof check.status === 'string';
      })
    );
  });
}

const GENERIC_ERROR =
  "The domain checker isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.";

export function DomainCheckTool() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<ToolState>({ kind: 'idle' });
  const turnstile = useTurnstile();

  // Local validation, purely for instant feedback. The probe validates independently — see
  // lib/domainInput.ts on why the duplication is deliberate.
  const preview = useMemo(() => normalise(input, MAX_DOMAINS), [input]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview.domains.length === 0) return;

    setState({ kind: 'loading' });

    try {
      const res = await fetch('/api/domain-check', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          domains: input,
          // Empty when Turnstile is unconfigured. The probe skips verification in that case, so
          // both halves agree — see components/useTurnstile.ts.
          ...(turnstile.token ? { turnstileToken: turnstile.token } : {}),
        }),
      });

      // A redeemed token is dead. Reset before reading the response so the next submission always
      // carries a fresh one, whatever happened to this one.
      turnstile.reset();

      if (res.status === 403) {
        setState({
          kind: 'error',
          message:
            "We couldn't confirm you're not a bot. Please complete the check above and try again.",
        });
        return;
      }

      if (res.status === 429) {
        setState({
          kind: 'error',
          message:
            "You've run a lot of checks in the last hour. Give it a little while and try again.",
        });
        return;
      }

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok || !isApiResponse(data)) {
        setState({ kind: 'error', message: GENERIC_ERROR });
        return;
      }

      setState({ kind: 'result', data });
    } catch {
      setState({ kind: 'error', message: GENERIC_ERROR });
    }
  }

  const count = preview.domains.length;

  return (
    <div>
      <form onSubmit={handleSubmit} className="kicker-card">
        <div className="field">
          <label htmlFor="domain-check-input">
            Domains &mdash; one per line, up to {MAX_DOMAINS}
          </label>
          <textarea
            id="domain-check-input"
            rows={6}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={'acme-outreach.com\nexample-sender.net'}
            className="font-mono text-sm"
          />
        </div>

        <p
          className="font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted mb-3"
          aria-live="polite"
        >
          {count} {count === 1 ? 'domain' : 'domains'} &middot; 5 checks each
          {preview.overCap > 0 ? ` · ${preview.overCap} over the limit, not checked` : ''}
          {preview.rejected.length > 0 ? ` · ${preview.rejected.length} not usable` : ''}
        </p>

        {/* Rendered only when a site key is configured; an unconfigured widget is a no-op div. */}
        <div ref={turnstile.containerRef} className="mb-3 empty:hidden" />

        {turnstile.state === 'failed' && (
          <p className="text-sm text-ink-muted mb-3">
            The bot check couldn&rsquo;t load. Reload the page to try again.
          </p>
        )}

        <button
          type="submit"
          disabled={state.kind === 'loading' || count === 0 || turnstile.blocking}
          className="btn btn-primary btn-block disabled:opacity-50"
        >
          {state.kind === 'loading'
            ? 'Checking…'
            : `Check ${count || ''} ${count === 1 ? 'domain' : 'domains'}`
                .replace(/\s+/g, ' ')
                .trim()}
        </button>
      </form>

      {state.kind === 'error' && (
        <div className="card mt-6 p-6 border-l-2 border-fail bg-cream">
          <p className="text-sm leading-relaxed text-ink-muted">{state.message}</p>
        </div>
      )}

      {state.kind === 'result' && (
        <div className="mt-[22px]">
          <div className="kicker-card">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted">
                {state.data.results.length} {state.data.results.length === 1 ? 'domain' : 'domains'}{' '}
                &middot; 5 checks each
              </span>
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted flex-none">
                Just now
              </span>
            </div>

            {/* Wide content scrolls inside its own container so the page never scrolls sideways. */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  SPF, DKIM, DMARC, MX and blocklist status for each domain
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-left font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted pb-2 pr-4"
                    >
                      Domain
                    </th>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.id}
                        scope="col"
                        title={column.explain}
                        className="text-left font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted pb-2 pr-4"
                      >
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.data.results.map((result) => {
                    const byId = new Map(result.checks.map((c) => [c.id, c]));
                    return (
                      <tr key={result.domain} className="border-t border-border">
                        <th
                          scope="row"
                          className="text-left font-mono text-[13px] py-3 pr-4 align-top font-normal break-all"
                        >
                          {result.domain}
                        </th>
                        {COLUMNS.map((column) => {
                          const check = byId.get(column.id);
                          return (
                            <td key={column.id} className="py-3 pr-4 align-top">
                              {check ? (
                                <span title={sentenceFor(check)}>
                                  <CheckBadge status={toBadgeStatus(check.status)} />
                                </span>
                              ) : (
                                <CheckBadge status="unknown" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* The findings, in prose, under the matrix. A badge grid says what; this says why. */}
          <div className="mt-6 space-y-5">
            {state.data.results.map((result) => {
              const notable = result.checks.filter((c) => c.status !== 'pass');
              if (notable.length === 0) return null;
              return (
                <div key={result.domain} className="kicker-card">
                  <div className="font-mono text-[12px] mb-2 break-all">{result.domain}</div>
                  {notable.map((check) => (
                    <div key={check.id} className="toggle-row">
                      <div className="t-label">
                        <b>{COLUMNS.find((c) => c.id === check.id)?.title ?? check.id}</b>
                        <span>{sentenceFor(check)}</span>
                      </div>
                      <CheckBadge status={toBadgeStatus(check.status)} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {state.data.meta.rejected.length > 0 && (
            <div className="card mt-6 p-6 bg-cream">
              <p className="text-sm text-ink-muted">
                We couldn&rsquo;t use{' '}
                {state.data.meta.rejected.length === 1
                  ? 'one entry'
                  : `${state.data.meta.rejected.length} entries`}
                :{' '}
                <span className="font-mono text-[12px] break-all">
                  {state.data.meta.rejected.map((r) => r.input).join(', ')}
                </span>
              </p>
            </div>
          )}

          {state.data.meta.overCap > 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              We checked the first {MAX_DOMAINS} domains. {state.data.meta.overCap} more
              weren&rsquo;t checked.
            </p>
          )}

          <p className="mt-5 text-sm text-ink-muted max-w-[60ch]">
            See this monitored continuously for all your sending domains, with alerts the moment
            something changes.{' '}
            <Link href="/checkout?tier=1" className="text-rust font-semibold">
              Try WarmHawk &rarr;
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
