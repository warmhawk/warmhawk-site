import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CheckoutButtons } from './CheckoutButtons';

/**
 * Regression guard for the Tier 1 checkout trigger — app/checkout/page.test.ts only confirms this
 * component's own start button mounts on the Tier 1 tab; the monthly/annual interval toggle and
 * the actual POST /api/checkout/session → redirect/error flow had zero coverage before this file.
 * No JSX, matching DomainCheckTool.test.ts's documented reason for this repo's .test.ts files.
 */
describe('CheckoutButtons', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    window.location = originalLocation;
  });

  it('defaults to monthly selected, and switches the selected interval on click', () => {
    render(createElement(CheckoutButtons));

    const monthly = screen.getByRole('button', { name: /monthly · \$199\/mo/i });
    const annual = screen.getByRole('button', { name: /annual · \$1,990\/yr/i });
    expect(monthly.className).toContain('btn-primary');
    expect(annual.className).toContain('btn-ghost');

    fireEvent.click(annual);
    expect(annual.className).toContain('btn-primary');
    expect(monthly.className).toContain('btn-ghost');

    fireEvent.click(monthly);
    expect(monthly.className).toContain('btn-primary');
    expect(annual.className).toContain('btn-ghost');
  });

  it('starts checkout with the selected interval and redirects to the returned Stripe URL', async () => {
    // @ts-expect-error -- jsdom's real navigation isn't implemented; stub href so we can assert on it.
    delete window.location;
    window.location = { ...originalLocation, href: '' } as unknown as Location;

    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session/abc' }),
      } as Response),
    );
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(CheckoutButtons));
    fireEvent.click(screen.getByRole('button', { name: /annual · \$1,990\/yr/i }));
    fireEvent.click(screen.getByRole('button', { name: /start your install/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/checkout/session',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ interval: 'annual' }) }),
      );
    });
    await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/session/abc'));
  });

  it('shows "Starting checkout…" and disables the button while the request is in flight', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );

    render(createElement(CheckoutButtons));
    fireEvent.click(screen.getByRole('button', { name: /start your install/i }));

    const button = await screen.findByRole('button', { name: /starting checkout…/i });
    expect(button).toBeDisabled();

    // Resolve with no `url` (not a real Stripe redirect) so this stays a pure loading-state test —
    // the redirect path itself is covered separately above.
    resolveFetch({ ok: true, json: () => Promise.resolve({}) } as Response);
    await waitFor(() => expect(screen.queryByText(/starting checkout…/i)).not.toBeInTheDocument());
  });

  it('shows the server-provided error message and never navigates when the API returns no url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: 'Stripe is not configured in this environment.' }),
        } as Response),
      ),
    );

    render(createElement(CheckoutButtons));
    fireEvent.click(screen.getByRole('button', { name: /start your install/i }));

    expect(await screen.findByText('Stripe is not configured in this environment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start your install/i })).toBeEnabled();
  });

  it('falls back to a generic message when the API returns neither a url nor an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)),
    );

    render(createElement(CheckoutButtons));
    fireEvent.click(screen.getByRole('button', { name: /start your install/i }));

    expect(
      await screen.findByText(/checkout is not configured in this environment yet/i),
    ).toBeInTheDocument();
  });

  it('shows a reach-the-endpoint fallback message when the request throws (network failure)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(CheckoutButtons));
    fireEvent.click(screen.getByRole('button', { name: /start your install/i }));

    expect(await screen.findByText(/could not reach the checkout endpoint/i)).toBeInTheDocument();
  });
});
