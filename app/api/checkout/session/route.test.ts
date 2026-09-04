import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { STRIPE_PRICE_IDS } from '@/lib/stripe';

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

describe('POST /api/checkout/session — tier: "tier_2" ($1,999 one-time setup fee + $199/mo software fee)', () => {
  beforeEach(() => {
    createSessionMock.mockReset();
  });

  it('creates a subscription-mode Checkout Session with the setup fee AND the recurring software price, plus tier_2 metadata', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-tier2' });

    const res = await POST(postRequest({ tier: 'tier_2' }));
    const json = (await res.json()) as { url?: string };

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://checkout.stripe.com/test-tier2');
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [
          { price: 'price_tier2_test', quantity: 1 },
          { price: 'price_monthly_test', quantity: 1 },
        ],
        metadata: expect.objectContaining({ tier: 'tier_2', billingInterval: 'monthly' }),
        subscription_data: { metadata: { tier: 'tier_2', billingInterval: 'monthly' } },
      }),
    );
  });

  it('does not set customer_creation — mode: "subscription" attaches a Customer automatically', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-tier2' });

    await POST(postRequest({ tier: 'tier_2' }));

    const call = createSessionMock.mock.calls[0]?.[0] as { customer_creation?: unknown };
    expect(call?.customer_creation).toBeUndefined();
  });

  it('points success/cancel URLs at /checkout?tier=2, not /compare/pricing (Tier 1’s target)', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-tier2' });

    await POST(postRequest({ tier: 'tier_2' }));

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/checkout?tier=2&checkout=success'),
        cancel_url: expect.stringContaining('/checkout?tier=2&checkout=cancelled'),
      }),
    );
  });

  it('ignores any interval field when tier is "tier_2" — Tier 2 is monthly-only, no annual price exists', async () => {
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/test-tier2' });

    await POST(postRequest({ tier: 'tier_2', interval: 'annual' }));

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_tier2_test', quantity: 1 },
          { price: 'price_monthly_test', quantity: 1 },
        ],
        metadata: expect.objectContaining({ billingInterval: 'monthly' }),
      }),
    );
  });

  it('returns a 500 config error when STRIPE_PRICE_TIER_2 is not set, without calling Stripe', async () => {
    // The mocked module's `as const` type marks `tier2` readonly; this test deliberately
    // simulates the unconfigured-environment case, so it goes through a mutable alias.
    const mutablePriceIds = STRIPE_PRICE_IDS as { tier2: string | undefined };
    const original = mutablePriceIds.tier2;
    mutablePriceIds.tier2 = undefined;
    try {
      const res = await POST(postRequest({ tier: 'tier_2' }));
      const json = (await res.json()) as { error?: string };

      expect(res.status).toBe(500);
      expect(json.error).toContain('STRIPE_PRICE_TIER_2');
      expect(createSessionMock).not.toHaveBeenCalled();
    } finally {
      mutablePriceIds.tier2 = original;
    }
  });

  it('returns a 500 config error when STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY is not set, without calling Stripe', async () => {
    const mutablePriceIds = STRIPE_PRICE_IDS as { selfHostedProMonthly: string | undefined };
    const original = mutablePriceIds.selfHostedProMonthly;
    mutablePriceIds.selfHostedProMonthly = undefined;
    try {
      const res = await POST(postRequest({ tier: 'tier_2' }));
      const json = (await res.json()) as { error?: string };

      expect(res.status).toBe(500);
      expect(json.error).toContain('STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY');
      expect(createSessionMock).not.toHaveBeenCalled();
    } finally {
      mutablePriceIds.selfHostedProMonthly = original;
    }
  });

  it('returns 502 and never leaks Stripe’s internal error message when tier_2 session creation throws', async () => {
    createSessionMock.mockRejectedValue(new Error('sk_live_super_secret_detail'));

    const res = await POST(postRequest({ tier: 'tier_2' }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toBeTruthy();
    expect(json.error).not.toContain('sk_live_super_secret_detail');
  });
});
