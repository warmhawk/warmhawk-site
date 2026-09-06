'use client';

import { Fragment, useMemo, useState, type FormEvent } from 'react';
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

const COLUMNS: { id: CheckId; title: string; explain: string; article: string }[] = [
  {
    id: 'mx',
    title: 'MX',
    article: 'an MX',
    explain:
      'MX records say where your inbound mail is delivered. A domain with no MX can still send perfectly well, so this is a warning rather than a failure.',
  },
  {
    id: 'spf',
    title: 'SPF',
    article: 'an SPF',
    explain:
      'SPF lists which servers may send for your domain. It is also capped at 10 DNS lookups by RFC 7208 — go over and receivers stop honouring the record entirely, silently.',
  },
  {
    id: 'dkim',
    title: 'DKIM',
    article: 'a DKIM',
    explain:
      'DKIM signs your outgoing mail so receivers can confirm it was not altered. Selectors cannot be listed from DNS, so we try nine common ones — a miss means we could not find it, not that it is missing.',
  },
  {
    id: 'dmarc',
    title: 'DMARC',
    article: 'a DMARC',
    explain:
      'DMARC tells receivers what to do when SPF or DKIM fails, and reports spoofing back to you. A p=none policy publishes a rule that asks receivers to do nothing.',
  },
  {
    id: 'bl',
    title: 'Blocklist',
    article: 'a blocklist',
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

const KNOWN_MX_PROVIDERS: ReadonlyArray<{ suffix: string; name: string }> = [
  { suffix: '.google.com', name: 'Google Workspace' },
  { suffix: '.protection.outlook.com', name: 'Microsoft 365' },
  { suffix: '.outlook.com', name: 'Microsoft 365' },
];

/**
 * The drawer's specific badge word (artifact's `r.badge`: "Google Workspace", "12 of 10 DNS
 * lookups", "p=none") in place of a generic PASS/WARN/FAIL/UNKNOWN — for every check type, not
 * only DMARC's `.fix` block. Every branch here reads a real field the probe already returns
 * (`facts.hosts`, `facts.lookupCount`, `facts.policy`, `facts.scope`/`ipsChecked`) or is a fixed,
 * always-true word tied to the check's own `label` — never a number or claim the probe can't back.
 *
 * The one artifact badge this deliberately does NOT copy is the blocklist's "Clear on 4 of 4": the
 * deployed probe only queries two real Spamhaus zones (`DBL_ZONE`, `ZEN_ZONE` in dnsChecks.ts, and
 * ZEN only when the domain declares sending IPs) — Barracuda and SORBS were never wired up, and an
 * earlier check found SORBS silently passing everything dead. Claiming "4 of 4" would be reporting
 * a defensive result nobody actually ran. `blocklistBadge` below states only what really ran.
 *
 * Returns `undefined` to fall back to the generic status word wherever no real, specific claim is
 * available (e.g. a lookup failure, or an MX host from a provider not in `KNOWN_MX_PROVIDERS`).
 */
function badgeLabelFor(check: ApiCheck): string | undefined {
  const facts = check.facts;
  const asNumber = (value: unknown): number | undefined =>
    typeof value === 'number' ? value : undefined;

  switch (check.id) {
    case 'mx': {
      if (check.label === 'mx-none' || check.label === 'mx-null') return 'No records';
      const hosts = facts?.hosts;
      if (!Array.isArray(hosts)) return undefined;
      const match = KNOWN_MX_PROVIDERS.find(({ suffix }) =>
        hosts.some((host) => typeof host === 'string' && host.toLowerCase().endsWith(suffix)),
      );
      return match?.name;
    }

    case 'spf': {
      const count = asNumber(facts?.lookupCount);
      const limit = asNumber(facts?.lookupLimit);
      return count !== undefined && limit !== undefined
        ? `${count} of ${limit} DNS lookups`
        : undefined;
    }

    case 'dkim':
      switch (check.label) {
        case 'dkim-found':
          return 'Selector found';
        case 'dkim-selector-not-found':
        case 'dkim-supplied-selector-not-found':
          return 'No selector found';
        case 'dkim-selector-revoked':
        case 'dkim-supplied-selector-revoked':
          return 'Selector revoked';
        default:
          return undefined;
      }

    case 'dmarc': {
      if (check.label === 'dmarc-none') return 'Missing';
      if (check.label === 'dmarc-multiple-records') return 'Multiple records';
      const policy = facts?.policy;
      return typeof policy === 'string' ? `p=${policy}` : undefined;
    }

    case 'bl':
      return blocklistBadge(check);

    default:
      return undefined;
  }
}

/** Only Spamhaus DBL (always) and Spamhaus ZEN (only when IPs were actually checked) are real. */
function blocklistBadge(check: ApiCheck): string | undefined {
  const facts = check.facts;
  const scope = facts?.scope;
  const ipsChecked = typeof facts?.ipsChecked === 'number' ? facts.ipsChecked : 0;

  if (check.label === 'bl-not-listed') {
    if (scope === 'domain+ips' && ipsChecked > 0) {
      return `Clear — Spamhaus DBL + ${ipsChecked} ${ipsChecked === 1 ? 'IP' : 'IPs'}`;
    }
    return 'Clear on Spamhaus DBL';
  }
  if (check.label === 'bl-domain-listed') return 'Listed on Spamhaus DBL';
  if (check.label === 'bl-ip-listed') {
    const listed = Array.isArray(facts?.ipsListed) ? facts.ipsListed.length : undefined;
    return listed ? `Listed on ${listed} of ${ipsChecked} IPs` : 'Listed on a sending IP';
  }
  return undefined;
}

/**
 * A copy-paste DNS record, offered only where one is universally safe regardless of which
 * provider the domain actually sends through — matching the design artifact's own `dmarcMissing`,
 * the only case it ever attaches a `fix` to. A missing DMARC record has one industry-standard,
 * non-enforcing starting point (`p=none`, monitor-only) that is safe for any sender. SPF and DKIM
 * have no such universal record — the right value depends entirely on which mail service actually
 * sends for this domain, so guessing one and publishing it as advice would be actively harmful
 * (see the `spf-none` case in `SENTENCES`, which explains rather than prescribes).
 *
 * `REPLACE-ME@` is deliberate, not a placeholder oversight — the copy rule from the design's own
 * product notes is that a placeholder must look fake, because `you@acme.com`-style addresses get
 * pasted into real DNS verbatim.
 */
function fixFor(check: ApiCheck, domain: string): { label: string; value: string } | null {
  if (check.label !== 'dmarc-none') return null;
  return {
    label: `Add this TXT record at _dmarc.${domain}`,
    value: `v=DMARC1; p=none; rua=mailto:REPLACE-ME@${domain}`,
  };
}

/** The `.fix` block (artifact's `dmarcMissing`) — a suggested record with one-click copy. */
function FixBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fix">
      <div className="fl">
        <span>{label}</span>
        <button
          type="button"
          className="cp"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code>{value}</code>
    </div>
  );
}

/** The probe's statuses map 1:1 onto the badge's. Anything unrecognised is `unknown`, not `pass`. */
function toBadgeStatus(status: ApiStatus): CheckStatus {
  return status === 'pass' || status === 'warn' || status === 'fail' ? status : 'unknown';
}

const PIP_ICON: Record<'pass' | 'warn' | 'fail' | 'unknown', string> = {
  pass: '✓',
  warn: '~',
  fail: '!',
  unknown: '?',
};

const PIP_LABEL: Record<'pass' | 'warn' | 'fail' | 'unknown', string> = {
  pass: 'PASS',
  warn: 'WARN',
  fail: 'FAIL',
  unknown: 'UNKNOWN',
};

/** Worst-first drawer ordering — lower sorts earlier. Ties break on CHECK_IDS order (stable sort). */
const SEVERITY_RANK: Record<ApiStatus, number> = { fail: 0, warn: 1, unknown: 2, pass: 3 };

/**
 * The matrix's icon-first status mark. Five of these sit in a row per domain, so the word from
 * `CheckBadge` becomes noise there — but the word is not dropped, only moved: it survives as a
 * visually-hidden label, so the same status still reaches a screen reader and the same text is
 * still there for a test (or a title-hover) to find.
 */
function StatusPip({ status, title }: { status: ApiStatus; title: string }) {
  // Narrower than `toBadgeStatus`'s own return type, which is `CheckStatus` — a wider union
  // shared with the dashboard's `pending`/`unconfigured` states this tool never produces.
  const key: 'pass' | 'warn' | 'fail' | 'unknown' =
    status === 'pass' || status === 'warn' || status === 'fail' ? status : 'unknown';
  return (
    <span title={title} className={`pip pip-${key}`}>
      <span aria-hidden="true">{PIP_ICON[key]}</span>
      <span className="sr-only">{PIP_LABEL[key]}</span>
    </span>
  );
}

interface Rollup {
  checked: number;
  failing: number;
  attention: number;
  allPassing: number;
}

/** Three mutually exclusive, exhaustive buckets — every domain lands in exactly one. */
function buildRollup(results: DomainResult[]): Rollup {
  let failing = 0;
  let attention = 0;
  let allPassing = 0;
  for (const result of results) {
    if (result.checks.some((c) => c.status === 'fail')) failing += 1;
    else if (result.checks.some((c) => c.status === 'warn' || c.status === 'unknown'))
      attention += 1;
    else allPassing += 1;
  }
  return { checked: results.length, failing, attention, allPassing };
}

interface SharedIssueInsight {
  kind: 'shared-issue';
  column: (typeof COLUMNS)[number];
  domains: string[];
}

interface PolicyDivergenceInsight {
  kind: 'policy-divergence';
  leaders: string[];
  leaderPolicy: string;
  laggards: string[];
  /** The one weaker policy every laggard shares, or null when they don't all share one. */
  laggardPolicy: string | null;
}

type Insight = SharedIssueInsight | PolicyDivergenceInsight;

/**
 * Surfaces the one check most worth reading first: whichever of the 5 checks is failing or
 * warning across the MOST domains at once, when that's 2 or more. Below 2 there is no shared
 * pattern to report — it's just one domain's own result, already visible in the row below.
 *
 * This deliberately stops at "N domains share an SPF problem" rather than naming the specific
 * cause (e.g. a shared bad SPF include) — the probe's `facts` don't carry the per-hop chain data
 * that a true root-cause claim would need, and asserting a specific cause the data can't support
 * would be exactly the kind of thing this component's own rules forbid.
 */
function buildInsight(results: DomainResult[]): SharedIssueInsight | null {
  const hits = new Map<CheckId, string[]>();
  for (const result of results) {
    for (const check of result.checks) {
      if (check.status === 'pass') continue;
      const list = hits.get(check.id) ?? [];
      list.push(result.domain);
      hits.set(check.id, list);
    }
  }
  let best: { id: CheckId; domains: string[] } | null = null;
  for (const id of CHECK_IDS) {
    const domains = hits.get(id);
    if (domains && domains.length >= 2 && (!best || domains.length > best.domains.length)) {
      best = { id, domains };
    }
  }
  if (!best) return null;
  const column = COLUMNS.find((c) => c.id === best.id);
  return column ? { kind: 'shared-issue', column, domains: best.domains } : null;
}

const DMARC_POLICY_STRENGTH: Record<string, number> = { none: 0, quarantine: 1, reject: 2 };

/**
 * The positive counterpart to `buildInsight`: when every domain passes every check, is there
 * still something worth copying between them? DMARC is the one check with a natural strength
 * order (`reject` > `quarantine` > `none`), so a mix of enforcement levels among fully-passing
 * domains is a real, honest finding — "you already solved this on one domain, apply it to the
 * rest" — built only from the `facts.policy` the probe actually returns.
 *
 * `p=none` can never appear here: the probe reports it as `warn`, never `pass` (see
 * `dnsChecks.ts`), so this and `buildInsight` are mutually exclusive by construction — a `warn`
 * on 2+ domains is caught above, before "every domain passes everything" can even be true.
 */
function buildDivergenceInsight(results: DomainResult[]): PolicyDivergenceInsight | null {
  if (results.length < 2) return null;
  if (!results.every((result) => result.checks.every((check) => check.status === 'pass'))) {
    return null;
  }

  const policies = results
    .map((result) => {
      const dmarc = result.checks.find((check) => check.id === 'dmarc');
      const policy = dmarc?.facts?.policy;
      const strength = typeof policy === 'string' ? DMARC_POLICY_STRENGTH[policy] : undefined;
      return typeof policy === 'string' && typeof strength === 'number'
        ? { domain: result.domain, policy, strength }
        : null;
    })
    .filter((v): v is { domain: string; policy: string; strength: number } => v !== null);
  if (policies.length < 2) return null;

  const strengths = policies.map((p) => p.strength);
  const maxStrength = Math.max(...strengths);
  const minStrength = Math.min(...strengths);
  if (maxStrength === minStrength) return null;

  const leaders = policies.filter((p) => p.strength === maxStrength);
  const laggards = policies.filter((p) => p.strength < maxStrength);
  const [firstLeader] = leaders;
  const [firstLaggard] = laggards;
  if (!firstLeader || !firstLaggard) return null;
  const laggardPolicies = new Set(laggards.map((p) => p.policy));

  return {
    kind: 'policy-divergence',
    leaders: leaders.map((p) => p.domain),
    leaderPolicy: firstLeader.policy,
    laggards: laggards.map((p) => p.domain),
    laggardPolicy: laggardPolicies.size === 1 ? firstLaggard.policy : null,
  };
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
  // Which domain rows are expanded to show their per-check findings. Keyed by domain string
  // rather than index, since the matrix doesn't reorder between renders.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const turnstile = useTurnstile();

  // Local validation, purely for instant feedback. The probe validates independently — see
  // lib/domainInput.ts on why the duplication is deliberate.
  const preview = useMemo(() => normalise(input, MAX_DOMAINS), [input]);

  function toggleExpanded(domain: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview.domains.length === 0) return;

    setState({ kind: 'loading' });
    setExpanded(new Set());

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
            <span className="font-normal text-ink-muted text-[12.5px]">
              {' '}
              &mdash; or comma-separated. Paste straight from a spreadsheet.
            </span>
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

        <div className="counter">
          <p
            className="font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted"
            aria-live="polite"
          >
            {count} {count === 1 ? 'domain' : 'domains'} &middot; 5 checks each
            {preview.overCap > 0 ? ` · ${preview.overCap} over the limit, not checked` : ''}
            {preview.rejected.length > 0 ? ` · ${preview.rejected.length} not usable` : ''}
          </p>
          <div
            className={`meter${count >= MAX_DOMAINS ? ' full' : ''}`}
            role="progressbar"
            // Deliberately doesn't contain "domains" (plural) — the textarea's own <label> already
            // matches /domains/i, and getByLabelText/i throws on a second, unrelated match.
            aria-label="Batch capacity used"
            aria-valuemin={0}
            aria-valuemax={MAX_DOMAINS}
            aria-valuenow={Math.min(count, MAX_DOMAINS)}
          >
            <i style={{ width: `${Math.min((count / MAX_DOMAINS) * 100, 100)}%` }} />
          </div>
          <span className="font-mono text-[11px] text-ink-muted whitespace-nowrap">
            max {MAX_DOMAINS} domains
          </span>
        </div>

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
          {(() => {
            const rollup = buildRollup(state.data.results);
            const insight: Insight | null =
              buildInsight(state.data.results) ?? buildDivergenceInsight(state.data.results);
            return (
              <div className="kicker-card mb-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 pb-3.5 mb-4 border-b border-border font-mono text-[11.5px] tracking-[0.06em] text-ink-muted">
                  <span>
                    <b className="text-ink font-semibold">{rollup.checked}</b>{' '}
                    {rollup.checked === 1 ? 'domain' : 'domains'} &middot; 5 checks each
                  </span>
                  <span className="text-[#A5977F]">&middot;</span>
                  <span>
                    <b className="text-ink font-semibold">{rollup.checked * CHECK_IDS.length}</b>{' '}
                    checks run
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3.5 items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="tally-num">{rollup.checked}</span>
                    <span className="font-mono text-[10px] tracking-[0.11em] uppercase text-ink-muted whitespace-nowrap">
                      Domains checked
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="tally-num is-fail">{rollup.failing}</span>
                    <span className="font-mono text-[10px] tracking-[0.11em] uppercase text-ink-muted whitespace-nowrap">
                      With a failing check
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="tally-num is-warn">{rollup.attention}</span>
                    <span className="font-mono text-[10px] tracking-[0.11em] uppercase text-ink-muted whitespace-nowrap">
                      Need attention
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="tally-num is-pass">{rollup.allPassing}</span>
                    <span className="font-mono text-[10px] tracking-[0.11em] uppercase text-ink-muted whitespace-nowrap">
                      All 5 passing
                    </span>
                  </div>
                </div>

                {insight?.kind === 'shared-issue' && (
                  <div className="insight-callout">
                    <b className="block text-[14.5px] font-semibold mb-0.5">
                      {insight.domains.length} of {rollup.checked} domains share{' '}
                      {insight.column.article} issue
                    </b>
                    <span className="text-[13.5px] text-ink-muted">
                      <b className="text-ink font-semibold">{insight.column.title}</b> is failing or
                      needs attention on every domain listed below.
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {insight.domains.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => setExpanded((prev) => new Set(prev).add(domain))}
                          className="font-mono text-[12px] bg-paper border border-border rounded-[5px] px-2 py-0.5 text-ink hover:border-rust break-all"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {insight?.kind === 'policy-divergence' && (
                  <div className="insight-callout">
                    <b className="block text-[14.5px] font-semibold mb-0.5">
                      All {rollup.checked} domains pass all 5 checks —{' '}
                      {insight.leaders.length === 1 ? 'one is' : `${insight.leaders.length} are`}{' '}
                      worth copying
                    </b>
                    <span className="text-[13.5px] text-ink-muted">
                      <b className="text-ink font-semibold break-all">
                        {insight.leaders.join(' and ')}
                      </b>{' '}
                      {insight.leaders.length === 1 ? 'enforces' : 'enforce'} DMARC at{' '}
                      <b className="text-ink font-semibold">p={insight.leaderPolicy}</b> while{' '}
                      {insight.laggards.length === 1
                        ? 'the other sits'
                        : `the other ${insight.laggards.length} sit`}{' '}
                      at{' '}
                      {insight.laggardPolicy ? (
                        <b className="text-ink font-semibold">p={insight.laggardPolicy}</b>
                      ) : (
                        'a weaker policy'
                      )}
                      . Matching the stronger policy is a five-minute change.
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {insight.laggards.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => setExpanded((prev) => new Set(prev).add(domain))}
                          className="font-mono text-[12px] bg-paper border border-border rounded-[5px] px-2 py-0.5 text-ink hover:border-rust break-all"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="kicker-card p-0 overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 flex-wrap px-6 py-3 bg-cream border-b border-border">
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted">
                {state.data.results.length} {state.data.results.length === 1 ? 'domain' : 'domains'}{' '}
                &middot; 5 checks each
              </span>
              <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-ink-muted flex-none">
                Just now
              </span>
            </div>

            {/* Wide content scrolls inside its own container so the page never scrolls sideways.
                border-separate (not the default collapse) is required for the sticky domain
                column below to keep a border while cells scroll beneath it. */}
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm min-w-[600px]">
                <caption className="sr-only">
                  SPF, DKIM, DMARC, MX and blocklist status for each domain
                </caption>
                <thead>
                  <tr aria-hidden="true">
                    <th scope="col" className="sticky left-0 z-[3] bg-cream px-4 py-1.5" />
                    <th
                      scope="col"
                      colSpan={COLUMNS.length}
                      className="text-center font-mono text-[9.5px] tracking-[0.15em] uppercase text-rust bg-cream px-3 py-1.5 font-semibold"
                    >
                      The same {CHECK_IDS.length} checks, every domain
                    </th>
                    <th scope="col" className="bg-cream px-2 py-1.5" />
                  </tr>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-[3] text-left font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted px-4 py-2 bg-cream border-r border-b border-border"
                    >
                      Domain
                    </th>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.id}
                        scope="col"
                        title={column.explain}
                        className="text-center font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-muted px-4 py-2 bg-cream border-b border-border"
                      >
                        {column.title}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-2 bg-cream border-b border-border">
                      <span className="sr-only">Expand</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.results.map((result, index) => {
                    const byId = new Map(result.checks.map((c) => [c.id, c]));
                    // Worst-first, matching the design's drawer ordering — ties keep CHECK_IDS
                    // order (Array.prototype.sort is stable) rather than reshuffling arbitrarily.
                    const worstFirst = [...result.checks].sort(
                      (a, b) => SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status],
                    );
                    const failingCount = result.checks.filter((c) => c.status === 'fail').length;
                    const worst: 'fail' | 'warn' | 'pass' = result.checks.some(
                      (c) => c.status === 'fail',
                    )
                      ? 'fail'
                      : result.checks.some((c) => c.status === 'warn' || c.status === 'unknown')
                        ? 'warn'
                        : 'pass';
                    const isOpen = expanded.has(result.domain);
                    const drawerId = `domain-check-drawer-${encodeURIComponent(result.domain)}`;
                    const nameId = `domain-check-name-${encodeURIComponent(result.domain)}`;
                    const toggleId = `domain-check-toggle-${encodeURIComponent(result.domain)}`;
                    // Zebra by domain-row index, not DOM nth-child — an open row's drawer <tr>
                    // sits between domain rows in the DOM, which would stripe the wrong rows if
                    // this used CSS nth-child the way a plain HTML table could.
                    const zebra = index % 2 === 1;
                    const rowBg = isOpen ? 'bg-cream' : zebra ? 'bg-[#F6F2E7]' : 'bg-paper';
                    const handleToggle = () => toggleExpanded(result.domain);
                    return (
                      <Fragment key={result.domain}>
                        {/* The whole row is the expand/collapse control — not just the caret —
                            matching the artifact's `tr.dr[role=button]`. Clicking anywhere except
                            a future interactive cell (there is none today) opens the drawer. */}
                        <tr
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          aria-controls={drawerId}
                          aria-labelledby={`${toggleId} ${nameId}`}
                          onClick={handleToggle}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            handleToggle();
                          }}
                          className={`group cursor-pointer border-t border-border hover:bg-rust-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-rust focus-visible:-outline-offset-2 ${rowBg}`}
                        >
                          <th
                            scope="row"
                            className={`sticky left-0 z-[1] border-r border-border text-left py-3 pl-4 pr-4 align-top font-normal group-hover:bg-rust-tint ${rowBg}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                aria-hidden="true"
                                className={`sev-bar ${
                                  worst === 'fail'
                                    ? 'bg-fail'
                                    : worst === 'warn'
                                      ? 'bg-pending'
                                      : 'bg-pass'
                                }`}
                              />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span
                                  id={nameId}
                                  className="font-mono text-[13px] font-medium text-ink break-all"
                                >
                                  {result.domain}
                                </span>
                                <span
                                  className={`text-[11px] whitespace-nowrap ${
                                    failingCount > 0 ? 'text-fail font-semibold' : 'text-ink-muted'
                                  }`}
                                >
                                  {failingCount} of {CHECK_IDS.length} checks failing
                                </span>
                              </div>
                            </div>
                          </th>
                          {COLUMNS.map((column) => {
                            const check = byId.get(column.id);
                            return (
                              <td key={column.id} className="py-3 pr-4 align-top text-center">
                                {check ? (
                                  <StatusPip status={check.status} title={sentenceFor(check)} />
                                ) : (
                                  <StatusPip
                                    status="unknown"
                                    title="No result came back for this domain."
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 pr-3 align-top text-right">
                            {/* Decorative only — the row itself carries role="button" and the
                                accessible name below, via aria-labelledby rather than a fresh
                                aria-label string: the domain is DNS-sourced and attacker-
                                controlled, and interpolating it into a new attribute value would
                                duplicate that untrusted text for no benefit over referencing the
                                name span's own (safely-escaped) text node. */}
                            <span id={toggleId} className="sr-only">
                              {isOpen ? 'Collapse' : 'Expand'}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`caret${isOpen ? ' open' : ' group-hover:text-rust group-hover:bg-paper group-hover:border-border'}`}
                            >
                              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path
                                  d="M6 3l5 5-5 5"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr id={drawerId} className="bg-cream">
                            <td colSpan={COLUMNS.length + 2} className="p-0">
                              <div className="border-l-[3px] border-rust px-4 py-1">
                                <p className="drawer-h">
                                  All {CHECK_IDS.length} checks for{' '}
                                  <b className="break-all">{result.domain}</b> · worst first
                                </p>
                                {worstFirst.map((check) => {
                                  const fix = fixFor(check, result.domain);
                                  return (
                                    <div key={check.id} className="toggle-row">
                                      <div className="t-label">
                                        <b>
                                          {COLUMNS.find((c) => c.id === check.id)?.title ??
                                            check.id}
                                        </b>
                                        <span>{sentenceFor(check)}</span>
                                        {fix && <FixBlock label={fix.label} value={fix.value} />}
                                      </div>
                                      <span className="flex-none pt-px">
                                        <CheckBadge
                                          status={toBadgeStatus(check.status)}
                                          label={badgeLabelFor(check)}
                                        />
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="legend-row">
              <span className="inline-flex items-center gap-1.5">
                <span className="pip pip-pass w-[18px] h-[18px] text-[10px]">✓</span> passing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="pip pip-fail w-[18px] h-[18px] text-[10px]">!</span> failing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="pip pip-warn w-[18px] h-[18px] text-[10px]">~</span> needs
                attention
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="pip pip-unknown w-[18px] h-[18px] text-[10px]">?</span>{' '}
                couldn&rsquo;t determine
              </span>
              <span className="ml-auto whitespace-nowrap">Click a domain for its findings</span>
            </div>
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

          <div className="gate-card">
            <h3 className="font-display text-xl font-semibold mb-1.5">
              Want this watched automatically?
            </h3>
            <p className="text-sm text-ink-muted max-w-[58ch] mb-0">
              WarmHawk re-runs these same 5 checks on a schedule and tells you only when a result
              changes for any domain you own &mdash; never a weekly &ldquo;all fine&rdquo; note.
            </p>
            <Link href="/checkout?tier=1" className="btn btn-primary mt-4">
              Try WarmHawk &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
