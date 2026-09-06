import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DomainCheckTool } from './DomainCheckTool';

/**
 * (No JSX here on purpose: this repo's Vitest setup runs on Vite's rolldown-based dependency,
 * which doesn't have a JSX/TSX transform wired in without adding a peer-conflicting plugin —
 * createElement() sidesteps that entirely.)
 */

function paste(value: string) {
  fireEvent.change(screen.getByLabelText(/domains/i), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /check/i }));
}

function checkRow(id: string, status: string, label: string, facts?: Record<string, unknown>) {
  return { id, status, label, ...(facts ? { facts } : {}) };
}

/** All 5 checks passing, with a real `dmarc-enforcing` label/facts carrying the given policy. */
function cleanPassingDomain(domain: string, dmarcPolicy: string) {
  return {
    domain,
    checks: [
      checkRow('mx', 'pass', 'mx-ok'),
      checkRow('spf', 'pass', 'spf-ok'),
      checkRow('dkim', 'pass', 'dkim-found'),
      checkRow('dmarc', 'pass', 'dmarc-enforcing', { policy: dmarcPolicy }),
      checkRow('bl', 'pass', 'bl-not-listed'),
    ],
  };
}

/** A well-formed response: five rows per domain, in the fixed order. */
function response(
  domain: string,
  statuses: [string, string][],
  meta: Partial<Record<string, unknown>> = {},
) {
  return {
    results: [
      {
        domain,
        checks: statuses.map(([id, status]) => checkRow(id, status, `${id}-x`)),
      },
    ],
    meta: {
      submitted: 1,
      deduplicated: 1,
      fresh: 1,
      cached: 0,
      rejected: [],
      truncated: false,
      overCap: 0,
      ...meta,
    },
  };
}

/** Like `response()`, but for asserting on the rollup/insight, which only mean anything across
 * more than one domain. */
function multiResponse(
  domains: [string, [string, string][]][],
  meta: Partial<Record<string, unknown>> = {},
) {
  return {
    results: domains.map(([domain, statuses]) => ({
      domain,
      checks: statuses.map(([id, status]) => checkRow(id, status, `${id}-x`)),
    })),
    meta: {
      submitted: domains.length,
      deduplicated: domains.length,
      fresh: domains.length,
      cached: 0,
      rejected: [],
      truncated: false,
      overCap: 0,
      ...meta,
    },
  };
}

function okFetch(body: unknown) {
  return vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response),
  );
}

const CLEAN: [string, string][] = [
  ['mx', 'pass'],
  ['spf', 'pass'],
  ['dkim', 'pass'],
  ['dmarc', 'pass'],
  ['bl', 'pass'],
];

/** CLEAN, with exactly one check's status swapped — every id is still present exactly once. */
function withStatus(id: string, status: string): [string, string][] {
  return CLEAN.map(([checkId, checkStatus]) =>
    checkId === id ? [checkId, status] : [checkId, checkStatus],
  ) as [string, string][];
}

describe('DomainCheckTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('posts to the SAME-ORIGIN proxy, never to a public API URL from the bundle', async () => {
    // The previous implementation fetched NEXT_PUBLIC_CORE_ENGINE_PUBLIC_API_URL straight from the
    // browser. That is build-time-inlined, cross-origin, and pointed at a customer's own engine —
    // it could not work and never did. The probe has no public address by design.
    const fetchSpy = okFetch(response('example.com', CLEAN));
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    await screen.findByRole('table');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/domain-check');
    expect(init.method).toBe('POST');
    expect(url).not.toMatch(/^https?:\/\//);
  });

  it('renders exactly five checks per domain, in the fixed order', async () => {
    vi.stubGlobal('fetch', okFetch(response('example.com', CLEAN)));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const table = await screen.findByRole('table');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    // The trailing 'Expand' header is the per-row expand/collapse control's column — its visible
    // text is empty, but an sr-only label still gives it an accessible name.
    expect(headers).toEqual(['Domain', 'MX', 'SPF', 'DKIM', 'DMARC', 'Blocklist', 'Expand']);
  });

  it('🔴 renders an UNKNOWN badge for unknown — never pass, never fail', async () => {
    // A DNSBL answering 127.255.255.254 is refusing the query. Showing FAIL accuses every domain
    // of being listed; showing PASS hides that the check stopped working. Both are worse than
    // saying we could not check.
    vi.stubGlobal(
      'fetch',
      okFetch(
        response('example.com', [
          ['mx', 'pass'],
          ['spf', 'pass'],
          ['dkim', 'pass'],
          ['dmarc', 'pass'],
          ['bl', 'unknown'],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('UNKNOWN')).toBeInTheDocument();
    expect(within(table).queryByText('FAIL')).not.toBeInTheDocument();
  });

  it('renders WARN as its own state — p=none is a finding, not a failure', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch(
        response('example.com', [
          ['mx', 'warn'],
          ['spf', 'pass'],
          ['dkim', 'pass'],
          ['dmarc', 'warn'],
          ['bl', 'pass'],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('WARN')).toHaveLength(2);
    expect(within(table).queryByText('FAIL')).not.toBeInTheDocument();
  });

  it('never renders a List-Unsubscribe row — it is not a sixth check', async () => {
    // RFC 8058 headers live on a sent message, not in DNS. Excluding it is what lets
    // "5 checks each" be literally true.
    vi.stubGlobal('fetch', okFetch(response('example.com', CLEAN)));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    await screen.findByRole('table');
    expect(screen.queryByText(/list-unsubscribe/i)).not.toBeInTheDocument();
  });

  it('says how many domains were dropped for exceeding the limit', async () => {
    vi.stubGlobal('fetch', okFetch(response('example.com', CLEAN, { overCap: 5 })));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/5 more weren.t checked/i)).toBeInTheDocument();
  });

  it('names the entries it could not use rather than dropping them silently', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch(
        response('example.com', CLEAN, {
          rejected: [{ input: 'localhost', reason: 'reserved-name' }],
        }),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/couldn.t use one entry/i)).toBeInTheDocument();
    expect(screen.getByText(/localhost/)).toBeInTheDocument();
  });

  it('tells the visitor they hit the rate limit, rather than claiming an outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) } as Response),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/run a lot of checks/i)).toBeInTheDocument();
  });

  it('degrades to an inline message, not a crash, on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/isn.t reachable right now/i)).toBeInTheDocument();
  });

  it('degrades on a malformed payload — a missing check row must not shift the matrix', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [{ domain: 'example.com', checks: [checkRow('mx', 'pass', 'mx-present')] }],
        meta: {},
      }),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/isn.t reachable right now/i)).toBeInTheDocument();
  });

  it('does not call the API at all when nothing valid was pasted', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(DomainCheckTool));
    paste('localhost\n127.0.0.1');
    submit();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('counts valid domains live, so "5 checks each" is visible before submitting', async () => {
    render(createElement(DomainCheckTool));
    paste('one.com\ntwo.com\nthree.com');
    expect(screen.getByText(/3 domains · 5 checks each/i)).toBeInTheDocument();
  });

  it('renders DNS-sourced domain names as text, never as markup', async () => {
    // Every value here is attacker-controlled and reaches the DOM only through JSX interpolation.
    vi.stubGlobal('fetch', okFetch(response('<img src=x onerror=alert(1)>.com', CLEAN)));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const table = await screen.findByRole('table');

    // No element was created from the payload — it is inert text.
    expect(within(table).queryByRole('img')).not.toBeInTheDocument();
    expect(table.innerHTML).not.toContain('<img');

    // It IS still shown to the visitor, escaped, rather than silently dropped. `innerHTML`
    // re-serialises that escaped text, so asserting on the raw substring there would fail against
    // perfectly safe markup — the meaningful assertions are "no element" and "present as text".
    expect(within(table).getByText('<img src=x onerror=alert(1)>.com')).toBeInTheDocument();
  });
  it('shows an actionable message when the bot check is rejected, not an outage message', async () => {
    // A 403 is the visitor's problem and they can fix it by completing the widget again. Telling
    // them "we're broken" would send them away waiting for a fix that is never coming.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'challenge-failed' }),
        } as Response),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    expect(await screen.findByText(/couldn.t confirm you.re not a bot/i)).toBeInTheDocument();
    expect(screen.queryByText(/isn.t reachable right now/i)).not.toBeInTheDocument();
  });

  it('submits with no turnstileToken field when Turnstile is unconfigured', async () => {
    // NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset in the test env, which is the supported local-dev
    // state. The probe applies the mirror-image rule — no secret, no verification — so an absent
    // token must NOT be sent as an empty string: the probe rejects unknown/blank fields, and a
    // half-configured pair is exactly how one environment starts refusing every request.
    const fetchSpy = okFetch(response('example.com', CLEAN));
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    await screen.findByRole('table');

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.domains).toBe('example.com');
    expect('turnstileToken' in sent).toBe(false);
  });

  it('leaves the submit button usable when Turnstile is unconfigured', async () => {
    // `blocking` must be false in the unconfigured state, or local dev and the test env would
    // render a form that can never be submitted.
    render(createElement(DomainCheckTool));
    paste('example.com');
    expect(screen.getByRole('button', { name: /check/i })).not.toBeDisabled();
  });

  it('shows the domain-count meter as a progress bar reading the same count as the text', async () => {
    render(createElement(DomainCheckTool));
    paste('one.com\ntwo.com\nthree.com');
    const meter = screen.getByRole('progressbar', { name: /batch capacity/i });
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuemax', '15');
  });

  it('restores the accurate hint that pasted input may be comma-separated', async () => {
    // lib/domainInput.ts really does split on `[\s,;]+`, so this is a true capability, not just
    // decoration — dropping it just means visitors don't know they can paste a spreadsheet column.
    render(createElement(DomainCheckTool));
    expect(screen.getByText(/comma-separated/i)).toBeInTheDocument();
  });

  it('rolls up how many of the batch are failing, need attention, or are all clean', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch(
        multiResponse([
          ['fails.com', withStatus('mx', 'fail')],
          ['warns.com', withStatus('dmarc', 'warn')],
          ['clean.com', CLEAN],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('fails.com\nwarns.com\nclean.com');
    submit();

    await screen.findByRole('table');
    expect(screen.getByText('Domains checked').previousElementSibling).toHaveTextContent('3');
    expect(screen.getByText('With a failing check').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Need attention').previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('All 5 passing').previousElementSibling).toHaveTextContent('1');
  });

  it('surfaces an insight only when 2+ domains share the same failing check', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch(
        multiResponse([
          ['a.com', withStatus('spf', 'fail')],
          ['b.com', withStatus('spf', 'fail')],
          ['c.com', CLEAN],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('a.com\nb.com\nc.com');
    submit();

    expect(await screen.findByText(/2 of 3 domains share an spf issue/i)).toBeInTheDocument();
  });

  it('shows no insight callout when nothing is shared across 2 or more domains', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch(
        multiResponse([
          ['a.com', withStatus('spf', 'fail')],
          ['b.com', CLEAN],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('a.com\nb.com');
    submit();

    await screen.findByRole('table');
    expect(screen.queryByText(/domains share/i)).not.toBeInTheDocument();
  });

  it('surfaces a divergence insight when every domain passes but DMARC enforcement differs', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          cleanPassingDomain('getacme.co', 'reject'),
          cleanPassingDomain('hey-goodmail.com', 'quarantine'),
          cleanPassingDomain('goodmail-hq.com', 'quarantine'),
        ],
        meta: {
          submitted: 3,
          deduplicated: 3,
          fresh: 3,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('getacme.co\nhey-goodmail.com\ngoodmail-hq.com');
    submit();

    const headline = await screen.findByText(/all 3 domains pass all 5 checks/i);
    const callout = headline.closest('.insight-callout') as HTMLElement;
    expect(within(callout).getByText('getacme.co')).toBeInTheDocument();
    expect(within(callout).getByText(/enforces dmarc at/i)).toBeInTheDocument();
    expect(within(callout).getByText('p=reject')).toBeInTheDocument();
    expect(within(callout).getByText(/the other 2 sit/i)).toBeInTheDocument();
    expect(within(callout).getByText('p=quarantine')).toBeInTheDocument();

    // The chips offered to click are the laggards worth fixing, not the domain already doing it right.
    expect(screen.getByRole('button', { name: 'hey-goodmail.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'goodmail-hq.com' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'getacme.co' })).not.toBeInTheDocument();
  });

  it('shows no divergence insight when every fully-passing domain already matches on DMARC policy', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          cleanPassingDomain('a.com', 'reject'),
          cleanPassingDomain('b.com', 'reject'),
        ],
        meta: {
          submitted: 2,
          deduplicated: 2,
          fresh: 2,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('a.com\nb.com');
    submit();

    await screen.findByRole('table');
    expect(screen.queryByText(/worth copying/i)).not.toBeInTheDocument();
  });

  it('never claims a divergence insight when any domain has an actual issue', async () => {
    // p=none itself is enough to disqualify: the probe reports it as `warn`, never `pass`, so
    // "every domain passes everything" — the insight's own precondition — is false here.
    vi.stubGlobal(
      'fetch',
      okFetch(
        multiResponse([
          ['a.com', withStatus('dmarc', 'warn')],
          ['b.com', CLEAN],
        ]),
      ),
    );

    render(createElement(DomainCheckTool));
    paste('a.com\nb.com');
    submit();

    await screen.findByRole('table');
    expect(screen.queryByText(/worth copying/i)).not.toBeInTheDocument();
  });

  it('keeps a domain’s findings collapsed until its row is expanded', async () => {
    // response()/checkRow() stamp a synthetic label ("mx-x"), so build this one fixture directly
    // with a real label — the drawer renders sentenceFor(check), and only a recognised label
    // produces a real sentence rather than the generic fallback.
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'example.com',
            checks: [
              { id: 'mx', status: 'fail', label: 'mx-none' },
              { id: 'spf', status: 'pass', label: 'spf-ok' },
              { id: 'dkim', status: 'pass', label: 'dkim-found' },
              { id: 'dmarc', status: 'pass', label: 'dmarc-enforcing' },
              { id: 'bl', status: 'pass', label: 'bl-not-listed' },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    await screen.findByRole('table');
    // The finding sentence lives in the collapsed drawer — it must not be visible until the row
    // is expanded.
    expect(screen.queryByText(/no mx records/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand example\.com/i }));
    expect(await screen.findByText(/no mx records/i)).toBeInTheDocument();

    // The drawer lists all 5 checks worst-first, not just the failing one — a passing check's
    // sentence (e.g. SPF, which is clean in this fixture) must also be present once expanded.
    expect(screen.getByText(/a valid spf record, within the lookup limit/i)).toBeInTheDocument();
    expect(screen.getByText(/all 5 checks for/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /collapse example\.com/i }));
    expect(screen.queryByText(/no mx records/i)).not.toBeInTheDocument();
  });

  it('expands a row by clicking anywhere in it, not only the caret', async () => {
    vi.stubGlobal('fetch', okFetch(response('example.com', CLEAN)));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const row = await screen.findByRole('button', { name: /expand example\.com/i });
    expect(row.tagName).toBe('TR');

    // Click a cell inside the row that is NOT the caret — the row itself is the click target
    // (matches the artifact's whole-row `role="button"`), so this must bubble up and open it.
    const domainCell = within(row).getByText('example.com');
    fireEvent.click(domainCell);
    expect(await screen.findByText(/all 5 checks for/i)).toBeInTheDocument();

    // Enter/Space on a focused row must also toggle it — the caret was never the only path.
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.queryByText(/all 5 checks for/i)).not.toBeInTheDocument();

    fireEvent.keyDown(row, { key: ' ' });
    expect(await screen.findByText(/all 5 checks for/i)).toBeInTheDocument();
  });

  it('offers a copy-paste DMARC fix only for a missing DMARC record, never for SPF or DKIM', async () => {
    // SPF/DKIM have no universally safe suggested record — the right value depends on which
    // provider actually sends for this domain — so fixFor() must return null for both, even
    // though both are also failing here. Only dmarc-none gets a `.fix` block.
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'acme-mail.io',
            checks: [
              { id: 'mx', status: 'pass', label: 'mx-present' },
              { id: 'spf', status: 'fail', label: 'spf-none' },
              { id: 'dkim', status: 'unknown', label: 'dkim-selector-not-found' },
              { id: 'dmarc', status: 'fail', label: 'dmarc-none' },
              { id: 'bl', status: 'pass', label: 'bl-not-listed' },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    render(createElement(DomainCheckTool));
    paste('acme-mail.io');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand acme-mail\.io/i }));
    await screen.findByText(/all 5 checks for/i);

    // Exactly one fix block — the DMARC one — using this domain's real name, and a placeholder
    // that looks obviously fake rather than a real-looking address someone could paste as-is.
    expect(screen.getByText('Add this TXT record at _dmarc.acme-mail.io')).toBeInTheDocument();
    expect(
      screen.getByText('v=DMARC1; p=none; rua=mailto:REPLACE-ME@acme-mail.io'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^copy$/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    expect(writeText).toHaveBeenCalledWith('v=DMARC1; p=none; rua=mailto:REPLACE-ME@acme-mail.io');
    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument();
  });

  it('shows a specific badge word per check, derived only from real facts, never the fabricated blocklist count', async () => {
    // Every field read here (hosts, lookupCount/lookupLimit, policy, scope, ipsChecked) is a real
    // field the probe already returns — none of this is invented. The one artifact badge
    // deliberately NOT reproduced is blocklist's "Clear on 4 of 4": the deployed probe only
    // queries two real Spamhaus zones, so a domain-scope pass must read "Clear on Spamhaus DBL",
    // never a fabricated "of 4".
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'getacme.co',
            checks: [
              {
                id: 'mx',
                status: 'pass',
                label: 'mx-present',
                facts: { count: 5, hosts: ['gmail-smtp-in.l.google.com'] },
              },
              {
                id: 'spf',
                status: 'pass',
                label: 'spf-ok',
                facts: { lookupCount: 9, lookupLimit: 10 },
              },
              { id: 'dkim', status: 'pass', label: 'dkim-found', facts: {} },
              {
                id: 'dmarc',
                status: 'warn',
                label: 'dmarc-policy-none',
                facts: { policy: 'none' },
              },
              {
                id: 'bl',
                status: 'pass',
                label: 'bl-not-listed',
                facts: { scope: 'domain', ipsChecked: 0 },
              },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('getacme.co');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand getacme\.co/i }));
    await screen.findByText(/all 5 checks for/i);

    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
    expect(screen.getByText('9 of 10 DNS lookups')).toBeInTheDocument();
    expect(screen.getByText('Selector found')).toBeInTheDocument();
    expect(screen.getByText('p=none')).toBeInTheDocument();
    expect(screen.getByText('Clear on Spamhaus DBL')).toBeInTheDocument();
    expect(screen.queryByText(/of 4/i)).not.toBeInTheDocument();
  });

  it('badges an over-the-limit SPF record with its real, failing lookup count', async () => {
    // Mirrors the artifact's spfOver() case — real domains rarely exceed the limit (the ones
    // tried during manual QA topped out at exactly 10 of 10), so this locks in the fail-side
    // badge with a synthetic-but-realistic fixture rather than depending on live DNS state.
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'acme-outreach.com',
            checks: [
              { id: 'mx', status: 'pass', label: 'mx-x' },
              {
                id: 'spf',
                status: 'fail',
                label: 'spf-lookup-limit-exceeded',
                facts: { lookupCount: 12, lookupLimit: 10 },
              },
              { id: 'dkim', status: 'pass', label: 'dkim-x' },
              { id: 'dmarc', status: 'pass', label: 'dmarc-x' },
              { id: 'bl', status: 'pass', label: 'bl-x' },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('acme-outreach.com');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand acme-outreach\.com/i }));
    expect(await screen.findByText('12 of 10 DNS lookups')).toBeInTheDocument();
  });

  it('badges a domain+IPs blocklist pass by what really ran, still never a Barracuda/SORBS claim', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'example.com',
            checks: [
              { id: 'mx', status: 'pass', label: 'mx-x' },
              { id: 'spf', status: 'pass', label: 'spf-x' },
              { id: 'dkim', status: 'pass', label: 'dkim-x' },
              { id: 'dmarc', status: 'pass', label: 'dmarc-x' },
              {
                id: 'bl',
                status: 'pass',
                label: 'bl-not-listed',
                facts: { scope: 'domain+ips', ipsChecked: 3 },
              },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand example\.com/i }));
    expect(await screen.findByText('Clear — Spamhaus DBL + 3 IPs')).toBeInTheDocument();
  });

  it('badges a domain-listed blocklist fail honestly — Spamhaus DBL, not the artifact\'s fabricated "1 of 4"', async () => {
    // Mirrors the artifact's acme-sales.net scenario ("Listed on 1 of 4 ... Clear on ZEN,
    // Barracuda and SORBS") — the honest version names only the one real zone that actually
    // flagged it, since Barracuda/SORBS were never wired into the deployed probe.
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'acme-sales.net',
            checks: [
              { id: 'mx', status: 'pass', label: 'mx-x' },
              { id: 'spf', status: 'pass', label: 'spf-x' },
              { id: 'dkim', status: 'pass', label: 'dkim-x' },
              { id: 'dmarc', status: 'pass', label: 'dmarc-x' },
              { id: 'bl', status: 'fail', label: 'bl-domain-listed', facts: { scope: 'domain' } },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('acme-sales.net');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand acme-sales\.net/i }));
    expect(await screen.findByText('Listed on Spamhaus DBL')).toBeInTheDocument();
    expect(screen.queryByText(/of 4/i)).not.toBeInTheDocument();
  });

  it('badges an IP-listed blocklist fail with the real listed/checked counts', async () => {
    vi.stubGlobal(
      'fetch',
      okFetch({
        results: [
          {
            domain: 'example.com',
            checks: [
              { id: 'mx', status: 'pass', label: 'mx-x' },
              { id: 'spf', status: 'pass', label: 'spf-x' },
              { id: 'dkim', status: 'pass', label: 'dkim-x' },
              { id: 'dmarc', status: 'pass', label: 'dmarc-x' },
              {
                id: 'bl',
                status: 'fail',
                label: 'bl-ip-listed',
                facts: { scope: 'domain+ips', ipsChecked: 3, ipsListed: ['203.0.113.9'] },
              },
            ],
          },
        ],
        meta: {
          submitted: 1,
          deduplicated: 1,
          fresh: 1,
          cached: 0,
          rejected: [],
          truncated: false,
          overCap: 0,
        },
      }),
    );

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    fireEvent.click(await screen.findByRole('button', { name: /expand example\.com/i }));
    expect(await screen.findByText('Listed on 1 of 3 IPs')).toBeInTheDocument();
  });

  it('offers a working link to WarmHawk from the closing gate card', async () => {
    vi.stubGlobal('fetch', okFetch(response('example.com', CLEAN)));

    render(createElement(DomainCheckTool));
    paste('example.com');
    submit();

    const link = await screen.findByRole('link', { name: /try warmhawk/i });
    expect(link).toHaveAttribute('href', '/checkout?tier=1');
  });
});
