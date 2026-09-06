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

function checkRow(id: string, status: string, label: string) {
  return { id, status, label };
}

/** A well-formed response: five rows per domain, in the fixed order. */
function response(domain: string, statuses: [string, string][], meta: Partial<Record<string, unknown>> = {}) {
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

function okFetch(body: unknown) {
  return vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response));
}

const CLEAN: [string, string][] = [
  ['mx', 'pass'],
  ['spf', 'pass'],
  ['dkim', 'pass'],
  ['dmarc', 'pass'],
  ['bl', 'pass'],
];

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
    expect(headers).toEqual(['Domain', 'MX', 'SPF', 'DKIM', 'DMARC', 'Blocklist']);
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
});
