import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DomainCheckTool } from './DomainCheckTool';

const ENV_KEY = 'NEXT_PUBLIC_CORE_ENGINE_PUBLIC_API_URL';

async function fillAndSubmit(domain = 'example.com') {
  fireEvent.change(screen.getByLabelText('Domain'), {
    target: { value: domain },
  });
  fireEvent.click(screen.getByRole('button', { name: /run the check/i }));
}

/**
 * Confirms /tools/domain-check's client component degrades gracefully —
 * a helpful inline error message, never a throw or a broken UI — when the
 * public core-engine API isn't configured or doesn't respond as expected.
 *
 * (No JSX here on purpose: this repo's Vitest setup runs on Vite's
 * rolldown-based dependency, which doesn't have a JSX/TSX transform wired
 * in without adding a peer-conflicting plugin — createElement() sidesteps
 * that entirely.)
 */
describe('DomainCheckTool graceful degradation', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('shows an honest inline error, not a crash, when the API URL env var is unset', async () => {
    delete process.env[ENV_KEY];
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(DomainCheckTool));
    await fillAndSubmit();

    expect(
      await screen.findByText(/domain-check service isn.t reachable right now/i),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows an inline error, not a crash, when the fetch call rejects (network failure)', async () => {
    process.env[ENV_KEY] = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(DomainCheckTool));
    await fillAndSubmit();

    expect(
      await screen.findByText(/domain-check service isn.t reachable right now/i),
    ).toBeInTheDocument();
  });

  it('shows an inline error, not a crash, when the response is a non-OK HTTP status', async () => {
    process.env[ENV_KEY] = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)),
    );

    render(createElement(DomainCheckTool));
    await fillAndSubmit();

    expect(
      await screen.findByText(/domain-check service isn.t reachable right now/i),
    ).toBeInTheDocument();
  });

  it('shows an inline error, not a crash, when the response body has an unexpected shape', async () => {
    process.env[ENV_KEY] = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ nonsense: true }) } as Response),
      ),
    );

    render(createElement(DomainCheckTool));
    await fillAndSubmit();

    expect(
      await screen.findByText(/domain-check service isn.t reachable right now/i),
    ).toBeInTheDocument();
  });

  it('renders real results when the API responds with a well-formed payload', async () => {
    process.env[ENV_KEY] = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              domain: 'example.com',
              spf: 'PASS',
              dkim: 'PASS',
              dmarc: 'FAIL',
              blocklists: {
                spamhausZen: 'PASS',
                spamhausDbl: 'PASS',
                barracuda: 'PASS',
                sorbs: 'PASS',
              },
              listUnsubscribeCheck:
                'RFC 8058 List-Unsubscribe headers are attached to sent messages, not resolvable ' +
                'from DNS for a bare domain — connect this domain in WarmHawk to verify it on real sends.',
            }),
        } as Response),
      ),
    );

    render(createElement(DomainCheckTool));
    await fillAndSubmit();

    expect(await screen.findByText(/example\.com/)).toBeInTheDocument();
  });
});
