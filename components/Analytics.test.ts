import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { Analytics } from './Analytics';

/**
 * Regression guard for the funnel-tracking effect in Analytics.tsx — specifically that
 * trackCheckoutComplete now fires on /checkout (Tier 2's Stripe success_url target, added
 * 2026-09-03) as well as /compare/pricing (Tier 1's, the original and only path before). Mocks
 * `@/lib/analytics` entirely (this file tests only Analytics.tsx's own path-gating logic — the
 * tracking functions themselves have no test coverage to duplicate here) and `next/navigation`'s
 * `usePathname` (no existing mocking precedent for it in this repo; this establishes one). Also
 * mocks ConsentBanner so this file stays scoped to the tracking effects, not banner markup.
 */
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('./ConsentBanner', () => ({
  ConsentBanner: () => null,
}));

const trackMock = vi.fn();
const pageviewMock = vi.fn();
const trackCheckoutCompleteMock = vi.fn();

vi.mock('@/lib/analytics', () => ({
  ANALYTICS_ENABLED: true,
  GA4_ENABLED: false,
  GA4_MEASUREMENT_ID: '',
  POSTHOG_ENABLED: false,
  POSTHOG_HOST: '',
  POSTHOG_KEY: '',
  EVENTS: {
    landingView: 'landing_view',
    pricingView: 'pricing_view',
    checkoutStart: 'checkout_start',
    checkoutComplete: 'checkout_complete',
  },
  isAutomatedClient: () => false,
  landingAttribution: () => ({}),
  readConsent: () => 'unset' as const,
  track: (...args: unknown[]) => trackMock(...args),
  pageview: (...args: unknown[]) => pageviewMock(...args),
  trackCheckoutComplete: (...args: unknown[]) => trackCheckoutCompleteMock(...args),
}));

function setUrl(pathname: string, search: string) {
  mockPathname = pathname;
  window.history.pushState({}, '', `${pathname}${search}`);
}

describe('Analytics funnel-tracking effect', () => {
  afterEach(() => {
    trackMock.mockClear();
    pageviewMock.mockClear();
    trackCheckoutCompleteMock.mockClear();
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('fires trackCheckoutComplete on /compare/pricing when checkout=success and session_id are present', async () => {
    setUrl('/compare/pricing', '?checkout=success&session_id=cs_test_123');

    render(createElement(Analytics));

    await waitFor(() => expect(trackCheckoutCompleteMock).toHaveBeenCalledWith('cs_test_123'));
  });

  it('fires trackCheckoutComplete on /checkout (Tier 2’s success_url target) as well', async () => {
    setUrl('/checkout', '?tier=2&checkout=success&session_id=cs_test_tier2');

    render(createElement(Analytics));

    await waitFor(() => expect(trackCheckoutCompleteMock).toHaveBeenCalledWith('cs_test_tier2'));
  });

  it('does not fire trackCheckoutComplete on an unrelated path even with checkout=success in the query', async () => {
    setUrl('/pricing-faq', '?checkout=success&session_id=cs_test_999');

    render(createElement(Analytics));
    await waitFor(() => expect(pageviewMock).toHaveBeenCalledWith('/pricing-faq'));

    expect(trackCheckoutCompleteMock).not.toHaveBeenCalled();
  });

  it('does not fire trackCheckoutComplete on /checkout without a session_id', async () => {
    setUrl('/checkout', '?tier=2&checkout=success');

    render(createElement(Analytics));
    await waitFor(() => expect(pageviewMock).toHaveBeenCalledWith('/checkout'));

    expect(trackCheckoutCompleteMock).not.toHaveBeenCalled();
  });

  it('only fires pricingView tracking on /compare/pricing, not on /checkout', async () => {
    setUrl('/checkout', '?tier=2');

    render(createElement(Analytics));
    await waitFor(() => expect(pageviewMock).toHaveBeenCalledWith('/checkout'));

    expect(trackMock).not.toHaveBeenCalledWith('pricing_view', expect.anything());
  });
});
