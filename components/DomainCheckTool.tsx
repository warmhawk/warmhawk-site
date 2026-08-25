'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckBadge, type CheckStatus } from '@/components/CheckBadge';

/**
 * Shape matches `warmhawk-core-engine`'s ACTUAL `GET /public/domain-check`
 * response (`apps/api/src/routes/publicDomainCheck.ts`) — bare uppercase
 * `'PASS'|'FAIL'` strings for spf/dkim/dmarc (no per-check detail/selector/
 * policy is returned, since `checkSpf`/`checkDkim`/`checkDmarc` in
 * `dnsChecks.ts` don't produce one), a per-DNSBL-source `blocklists` map
 * (`{spamhausZen: 'PASS', ...}`), and `listUnsubscribeCheck` as a plain
 * explanatory string, not a checkable status — RFC 8058 headers live on a
 * sent message, not something resolvable from DNS for a bare domain, so the
 * route deliberately never fabricates a PASS/FAIL for it (see that route's
 * own doc comment). This was previously a different, incompatible shape
 * that would have made every real API response fail validation here —
 * fixed to match the real contract.
 */
type ApiCheckStatus = 'PASS' | 'FAIL';

interface DomainCheckResponse {
  domain: string;
  spf: ApiCheckStatus;
  dkim: ApiCheckStatus;
  dmarc: ApiCheckStatus;
  blocklists: Record<string, ApiCheckStatus>;
  listUnsubscribeCheck: string;
}

type ToolState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; data: DomainCheckResponse };

function toBadgeStatus(status: ApiCheckStatus): CheckStatus {
  return status === 'PASS' ? 'pass' : 'fail';
}

const DNS_CHECK_ROWS: {
  key: keyof Pick<DomainCheckResponse, 'spf' | 'dkim' | 'dmarc'>;
  title: string;
  explain: string;
}[] = [
  {
    key: 'spf',
    title: 'SPF',
    explain:
      "SPF lists which mail servers are allowed to send email for your domain — a FAIL here means receiving servers can't verify your mail is legitimate.",
  },
  {
    key: 'dkim',
    title: 'DKIM',
    explain:
      'DKIM cryptographically signs your outgoing mail so the receiving server can confirm it wasn’t altered in transit — a missing or FAILing signature makes every message look tamperable.',
  },
  {
    key: 'dmarc',
    title: 'DMARC',
    explain:
      'DMARC tells receiving servers what to do when SPF or DKIM fails, and reports back to you when someone spoofs your domain — without it, a spoofed message and a legitimate one are handled identically.',
  },
];

function isDomainCheckResponse(value: unknown): value is DomainCheckResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const isPassFail = (v: unknown) => v === 'PASS' || v === 'FAIL';
  if (!isPassFail(record.spf) || !isPassFail(record.dkim) || !isPassFail(record.dmarc)) {
    return false;
  }
  if (!record.blocklists || typeof record.blocklists !== 'object') return false;
  if (!Object.values(record.blocklists as Record<string, unknown>).every(isPassFail)) return false;
  return typeof record.listUnsubscribeCheck === 'string';
}

export function DomainCheckTool() {
  const [domain, setDomain] = useState('');
  const [state, setState] = useState<ToolState>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;

    const apiUrl = process.env.NEXT_PUBLIC_CORE_ENGINE_PUBLIC_API_URL;
    if (!apiUrl) {
      setState({
        kind: 'error',
        message:
          "The domain-check service isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.",
      });
      return;
    }

    setState({ kind: 'loading' });

    try {
      const res = await fetch(
        `${apiUrl}/public/domain-check?domain=${encodeURIComponent(trimmed)}`,
        { headers: { Accept: 'application/json' } },
      );

      if (!res.ok) {
        setState({
          kind: 'error',
          message:
            "The domain-check service isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.",
        });
        return;
      }

      const data: unknown = await res.json();

      if (!isDomainCheckResponse(data)) {
        setState({
          kind: 'error',
          message:
            "The domain-check service isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.",
        });
        return;
      }

      setState({ kind: 'result', data });
    } catch {
      setState({
        kind: 'error',
        message:
          "The domain-check service isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.",
      });
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="kicker-card">
        <div className="field">
          <label htmlFor="domain-check-input">Domain</label>
          <input
            id="domain-check-input"
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="e.g. acme-outreach.com"
          />
        </div>
        <button
          type="submit"
          disabled={state.kind === 'loading' || !domain.trim()}
          className="btn btn-primary btn-block disabled:opacity-50"
        >
          {state.kind === 'loading' ? 'Checking…' : 'Run the check'}
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
            <div className="flex items-baseline justify-between gap-3 mb-2.5">
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted">
                Results for {state.data.domain}
              </span>
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted flex-none">
                Just now
              </span>
            </div>

            {DNS_CHECK_ROWS.map((row) => {
              const status = state.data[row.key];
              return (
                <div key={row.key} className="toggle-row">
                  <div className="t-label">
                    <b>{row.title}</b>
                    <span>{row.explain}</span>
                  </div>
                  <CheckBadge status={toBadgeStatus(status)} />
                </div>
              );
            })}

            {(() => {
              const sources = Object.entries(state.data.blocklists);
              const worstStatus: ApiCheckStatus = sources.some(([, s]) => s === 'FAIL')
                ? 'FAIL'
                : 'PASS';
              return (
                <div className="toggle-row">
                  <div className="t-label">
                    <b>Blocklist status</b>
                    <span>
                      Checked against major DNSBLs
                      {sources.length > 0 ? `: ${sources.map(([name]) => name).join(', ')}` : ''}
                    </span>
                  </div>
                  <CheckBadge status={toBadgeStatus(worstStatus)} />
                </div>
              );
            })()}

            <div className="toggle-row">
              <div className="t-label">
                <b>List-Unsubscribe (RFC 8058)</b>
                <span>{state.data.listUnsubscribeCheck}</span>
              </div>
              <span className="badge badge-unconfigured">
                <span className="badge-dot" aria-hidden="true" />
                INFO
              </span>
            </div>
          </div>

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
