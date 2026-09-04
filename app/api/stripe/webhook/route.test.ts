import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Tests app/api/stripe/webhook/route.ts — this repo's centrally-operated Stripe webhook, the one
 * piece of billing infrastructure WarmHawk itself runs (see lib/license.ts's module doc). Mocks
 * `@/lib/stripe` (never verifies a real signature), `@/lib/license` (its own crypto is already
 * covered by lib/license.test.ts — this file tests THIS route's branching: customer-id
 * resolution, missing-private-key handling, email dispatch, and the deliberate no-op on
 * payment-failure/cancellation events), and `@/lib/email` (never sends real mail).
 */
const constructEventMock = vi.fn();
const sendLicenseEmailMock = vi.fn();
const issueLicenseMock = vi.fn();
const subscriptionsUpdateMock = vi.fn();
const computeExpiryMock = vi.fn<(date: Date, interval: string) => number>(() => 1893456000);

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { update: subscriptionsUpdateMock },
  }),
}));

vi.mock('@/lib/license', () => ({
  generateLicenseKey: () => 'whk_test_generated',
  issueLicense: (...args: unknown[]) => {
    issueLicenseMock(...args);
    return { token: 'signed.test.token' };
  },
  computeExpiry: (date: Date, interval: string) => computeExpiryMock(date, interval),
}));

vi.mock('@/lib/email', () => ({
  emailSender: {
    sendLicenseEmail: (...args: unknown[]) => sendLicenseEmailMock(...args),
    sendSalesInquiryEmail: vi.fn(),
  },
}));

function webhookRequest(
  body: string,
  headers: Record<string, string> = { 'stripe-signature': 'sig_test' },
) {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

function invoicePaidEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_test_1',
    type: 'invoice.paid',
    data: {
      object: {
        customer: 'cus_test_123',
        customer_email: 'customer@example.com',
        lines: { data: [{ price: { id: 'price_monthly_test' } }] },
        metadata: { billingInterval: 'monthly' },
        ...overrides,
      },
    },
  };
}

describe('POST /api/stripe/webhook', () => {
  const ORIGINAL_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const ORIGINAL_PRIVATE_KEY = process.env.LICENSE_SIGNING_PRIVATE_KEY;

  beforeEach(() => {
    constructEventMock.mockReset();
    sendLicenseEmailMock.mockReset();
    issueLicenseMock.mockReset();
    subscriptionsUpdateMock.mockReset();
    computeExpiryMock.mockClear();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.LICENSE_SIGNING_PRIVATE_KEY = 'test-private-key-pem';
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
    process.env.LICENSE_SIGNING_PRIVATE_KEY = ORIGINAL_PRIVATE_KEY;
  });

  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await POST(webhookRequest('{}', {}));
    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it('returns 400 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(webhookRequest('{}'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification throws', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const res = await POST(webhookRequest('{}'));
    const json = (await res.json()) as { error?: string };
    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid signature');
  });

  it('issues a license and emails it on invoice.paid with a resolvable customer + email', async () => {
    constructEventMock.mockReturnValue(invoicePaidEvent());

    const res = await POST(webhookRequest('{}'));
    const json = (await res.json()) as { received: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    // This same token now does double duty as the registry pull credential -- see
    // app/api/registry/token/route.ts's verifyLicense() call. No new credential is minted at
    // webhook time for that; nothing here needs to change on that account.
    expect(issueLicenseMock).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_test_123', tier: 'tier_1' }),
      'test-private-key-pem',
    );
    expect(sendLicenseEmailMock).toHaveBeenCalledWith({
      toEmail: 'customer@example.com',
      licenseToken: 'signed.test.token',
      tier: 'tier_1',
    });
  });

  it('resolves tier_2 from invoice metadata — Tier 2’s recurring price is identical to Tier 1’s, so price id can’t disambiguate them', async () => {
    constructEventMock.mockReturnValue(
      invoicePaidEvent({
        // Same price id a Tier 1 invoice would carry — this is the whole point of the regression
        // guard: tier resolution must come from metadata, not this field.
        lines: { data: [{ price: { id: 'price_monthly_test' } }] },
        metadata: { tier: 'tier_2', billingInterval: 'monthly' },
      }),
    );

    await POST(webhookRequest('{}'));

    expect(issueLicenseMock).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'tier_2' }),
      expect.anything(),
    );
  });

  it('issues a Tier 2 license on its FIRST invoice — the one that also carries the one-time $1,999 setup fee', async () => {
    constructEventMock.mockReturnValue(
      invoicePaidEvent({
        customer: 'cus_test_tier2',
        customer_email: 'buyer@example.com',
        // First invoice of a Tier 2 subscription carries both line items.
        lines: {
          data: [{ price: { id: 'price_tier2_test' } }, { price: { id: 'price_monthly_test' } }],
        },
        metadata: { tier: 'tier_2', billingInterval: 'monthly' },
      }),
    );

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_test_tier2', tier: 'tier_2' }),
      'test-private-key-pem',
    );
    expect(computeExpiryMock).toHaveBeenCalledWith(expect.any(Date), 'monthly');
    expect(sendLicenseEmailMock).toHaveBeenCalledWith({
      toEmail: 'buyer@example.com',
      licenseToken: 'signed.test.token',
      tier: 'tier_2',
    });
  });

  it('issues a Tier 2 license on a RENEWAL invoice too, even with no setup-fee line item present', async () => {
    constructEventMock.mockReturnValue(
      invoicePaidEvent({
        customer: 'cus_test_tier2',
        customer_email: 'buyer@example.com',
        // Renewal invoices only ever carry the recurring line — the one-time setup fee billed
        // once, on the first invoice only.
        lines: { data: [{ price: { id: 'price_monthly_test' } }] },
        metadata: { tier: 'tier_2', billingInterval: 'monthly' },
      }),
    );

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'tier_2' }),
      expect.anything(),
    );
  });

  it('ignores checkout.session.completed entirely — invoice.paid is the sole issuance trigger for both tiers now that Tier 2 is a real subscription', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_test_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          metadata: { tier: 'tier_2' },
          customer: 'cus_test_123',
          customer_details: { email: 'customer@example.com' },
        },
      },
    });

    const res = await POST(webhookRequest('{}'));
    const json = (await res.json()) as { received: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(issueLicenseMock).not.toHaveBeenCalled();
    expect(sendLicenseEmailMock).not.toHaveBeenCalled();
  });

  it('resolves the annual expiry from invoice metadata (propagated via subscription_data, not Checkout Session metadata)', async () => {
    constructEventMock.mockReturnValue(
      invoicePaidEvent({ metadata: { billingInterval: 'annual' } }),
    );

    await POST(webhookRequest('{}'));

    expect(computeExpiryMock).toHaveBeenCalledWith(expect.any(Date), 'annual');
  });

  it('skips issuing a license (but still returns 200) when the event has no resolvable customer id', async () => {
    constructEventMock.mockReturnValue(invoicePaidEvent({ customer: undefined }));

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).not.toHaveBeenCalled();
    expect(sendLicenseEmailMock).not.toHaveBeenCalled();
  });

  it('does not issue a license when LICENSE_SIGNING_PRIVATE_KEY is not configured', async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    constructEventMock.mockReturnValue(invoicePaidEvent());

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).not.toHaveBeenCalled();
  });

  it('takes no action (does not revoke, does not email) on invoice.payment_failed', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_test_2',
      type: 'invoice.payment_failed',
      data: { object: {} },
    });

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).not.toHaveBeenCalled();
    expect(sendLicenseEmailMock).not.toHaveBeenCalled();
  });

  it('takes no action on customer.subscription.deleted', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_test_3',
      type: 'customer.subscription.deleted',
      data: { object: {} },
    });

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(200);
    expect(issueLicenseMock).not.toHaveBeenCalled();
  });

  it('ignores an unhandled event type without crashing', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_test_4',
      type: 'customer.updated',
      data: { object: {} },
    });

    const res = await POST(webhookRequest('{}'));
    const json = (await res.json()) as { received: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
  });

  it('returns 500 if handling the event throws unexpectedly', async () => {
    constructEventMock.mockReturnValue(invoicePaidEvent());
    sendLicenseEmailMock.mockRejectedValue(new Error('smtp exploded'));

    const res = await POST(webhookRequest('{}'));

    expect(res.status).toBe(500);
  });
});
