import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Tier2CheckoutButton } from './Tier2CheckoutButton';

/**
 * Regression guard for the Tier 2 self-serve checkout trigger — mirrors CheckoutButtons.test.ts's
 * pattern (this repo's established shape for a POST /api/checkout/session → redirect/error flow),
 * minus the interval toggle since Tier 2 is a single one-time $1,999 payment.
 */
describe('Tier2CheckoutButton', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    window.location = originalLocation;
  });

  it('POSTs { tier: "tier_2" } and redirects to the returned Stripe URL', async () => {
    // @ts-expect-error -- jsdom's real navigation isn't implemented; stub href so we can assert on it.
    delete window.location;
    window.location = { ...originalLocation, href: '' } as unknown as Location;

    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session/tier2abc' }),
      } as Response),
    );
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(Tier2CheckoutButton));
    fireEvent.click(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/checkout/session',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ tier: 'tier_2' }) }),
      );
    });
    await waitFor(() =>
      expect(window.location.href).toBe('https://checkout.stripe.com/session/tier2abc'),
    );
  });

  it('shows "Starting checkout…" and disables the button while the request is in flight', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );

    render(createElement(Tier2CheckoutButton));
    fireEvent.click(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i }));

    const button = await screen.findByRole('button', { name: /starting checkout…/i });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve({}) } as Response);
    await waitFor(() => expect(screen.queryByText(/starting checkout…/i)).not.toBeInTheDocument());
  });

  it('shows the server-provided error message and never navigates when the API returns no url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              error:
                'Stripe price ID not configured for this environment. Set STRIPE_PRICE_TIER_2.',
            }),
        } as Response),
      ),
    );

    render(createElement(Tier2CheckoutButton));
    fireEvent.click(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i }));

    expect(
      await screen.findByText(
        'Stripe price ID not configured for this environment. Set STRIPE_PRICE_TIER_2.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i })).toBeEnabled();
  });

  it('falls back to a generic message when the API returns neither a url nor an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)),
    );

    render(createElement(Tier2CheckoutButton));
    fireEvent.click(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i }));

    expect(
      await screen.findByText(/checkout is not configured in this environment yet/i),
    ).toBeInTheDocument();
  });

  it('shows a reach-the-endpoint fallback message when the request throws (network failure)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(Tier2CheckoutButton));
    fireEvent.click(screen.getByRole('button', { name: /get started — \$1,999 \+ \$199\/mo/i }));

    expect(await screen.findByText(/could not reach the checkout endpoint/i)).toBeInTheDocument();
  });
});
