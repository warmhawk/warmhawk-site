import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Tests app/api/checkout/session/route.ts — this repo's Tier 1 (Self-Hosted Pro) Stripe Checkout
 * Session creation route. Follows this repo's established mocking convention
 * (lib/statusProvider.test.ts stubs `fetch`; this stubs the `stripe` client the same way) — never
 * hits a live Stripe API. `@/lib/stripe` is mocked entirely so STRIPE_PRICE_IDS is deterministic
 * regardless of this environment's real env vars. `vi.mock` calls are hoisted above imports by
 * vitest, so this mock is in place before route.ts's own `import { STRIPE_PRICE_IDS } from
 * '@/lib/stripe'` resolves.
 */
const createSessionMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: createSessionMock } } }),
  STRIPE_PRICE_IDS: {
    selfHostedProMonthly: 'price_monthly_test',
    selfHostedProAnnual: 'price_annual_test',
    tier2: 'price_tier2_test',
  },
}));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/checkout/session', () => {
  beforeEach(() => {
    createSessionMock.mockReset();
  });

  it('creates a monthly subscription Checkout Session by default', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-monthly' });

    const res = await POST(postRequest({}));
    const json = (await res.json()) as { url?: string };

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://checkout.stripe.com/test-monthly');
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_monthly_test', quantity: 1 }],
        metadata: expect.objectContaining({ tier: 'tier_1', billingInterval: 'monthly' }),
        subscription_data: { metadata: { tier: 'tier_1', billingInterval: 'monthly' } },
      }),
    );
  });

  it('uses the annual price and metadata when interval is "annual"', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-annual' });

    await POST(postRequest({ interval: 'annual' }));

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_annual_test', quantity: 1 }],
        metadata: expect.objectContaining({ billingInterval: 'annual' }),
        // Regression guard: the webhook resolves license expiry from `invoice.metadata`, which
        // only inherits from `subscription_data.metadata`, never the Checkout Session's own
        // top-level `metadata` — see app/api/stripe/webhook/route.ts's header comment.
        subscription_data: { metadata: { tier: 'tier_1', billingInterval: 'annual' } },
      }),
    );
  });

  it('defaults to monthly for an unrecognized interval value', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    await POST(postRequest({ interval: 'weekly' }));

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: 'price_monthly_test', quantity: 1 }] }),
    );
  });

  it('handles a missing/invalid JSON body by defaulting to monthly', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    const req = new NextRequest('http://localhost/api/checkout/session', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: 'price_monthly_test', quantity: 1 }] }),
    );
  });

  it('returns 502 and never leaks Stripe’s internal error message when session creation throws', async () => {
    createSessionMock.mockRejectedValue(new Error('sk_live_super_secret_detail'));

    const res = await POST(postRequest({}));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toBeTruthy();
    expect(json.error).not.toContain('sk_live_super_secret_detail');
  });
});
