import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WatchForm } from './WatchForm';

function okFetch(body: unknown, status = 200) {
  return vi.fn(() =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response),
  );
}

function typeEmail(value: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /email me on changes/i }));
}

describe('WatchForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('poses the heading in terms of the real domain count, not a bare number', () => {
    render(createElement(WatchForm, { domains: ['a.com', 'b.com', 'c.com'] }));
    expect(screen.getByRole('heading', { name: 'Watch all 3 domains' })).toBeInTheDocument();
  });

  it('says "this domain" for a single-domain batch, never "all 1 domains"', () => {
    render(createElement(WatchForm, { domains: ['a.com'] }));
    expect(screen.getByRole('heading', { name: 'Watch this domain' })).toBeInTheDocument();
  });

  it('posts to the same-origin proxy with the exact domains it was given', async () => {
    const fetchSpy = okFetch({ status: 'pending' });
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(WatchForm, { domains: ['acme-outreach.com', 'try-acme.com'] }));
    typeEmail('ops@acme-outreach.com');
    submit();

    await screen.findByText(/check your inbox/i);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/domain-watch');
    const sentBody = JSON.parse(init.body as string) as { email: string; domains: string };
    expect(sentBody.email).toBe('ops@acme-outreach.com');
    expect(sentBody.domains).toBe('acme-outreach.com\ntry-acme.com');
  });

  it('shows the identical "check your inbox" success state regardless of what the probe did internally', async () => {
    // The probe's response is the SAME `{status:'pending'}` whether this was a brand new signup, a
    // resubmission of an already-active email, or a still-pending resend — see WatchForm's own
    // comment on why the UI must never branch on that.
    vi.stubGlobal('fetch', okFetch({ status: 'pending' }));

    render(createElement(WatchForm, { domains: ['acme-outreach.com'] }));
    typeEmail('ops@acme-outreach.com');
    submit();

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText('ops@acme-outreach.com')).toBeInTheDocument();
  });

  it('shows a bot-check message on a 403', async () => {
    vi.stubGlobal('fetch', okFetch({ error: 'turnstile' }, 403));

    render(createElement(WatchForm, { domains: ['a.com'] }));
    typeEmail('ops@acme.com');
    submit();

    expect(await screen.findByText(/couldn.t confirm you.re not a bot/i)).toBeInTheDocument();
  });

  it('shows a rate-limit message on a 429', async () => {
    vi.stubGlobal('fetch', okFetch({ error: 'rate-limited' }, 429));

    render(createElement(WatchForm, { domains: ['a.com'] }));
    typeEmail('ops@acme.com');
    submit();

    expect(await screen.findByText(/submitted a lot of watch requests/i)).toBeInTheDocument();
  });

  it('falls back to a generic message on an unexpected failure, never a raw error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(WatchForm, { domains: ['a.com'] }));
    typeEmail('ops@acme.com');
    submit();

    expect(await screen.findByText(/isn.t reachable right now/i)).toBeInTheDocument();
  });

  it('never submits with an empty email', () => {
    const fetchSpy = okFetch({ status: 'pending' });
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(WatchForm, { domains: ['a.com'] }));
    submit();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
