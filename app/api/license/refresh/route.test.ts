import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
  issueLicense,
  verifyLicense,
  derivePublicKeyPem,
  type LicensePayload,
} from '@/lib/license';
import { TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * Tests app/api/license/refresh/route.ts — the renewal half of the subscription lifecycle added by
 * the 2026-08-30 go-live audit (finding L1). Mocks `@/lib/stripe` so nothing here touches a live
 * Stripe API, matching the checkout/session, portal and webhook route tests.
 *
 * The security-relevant property under test is that entitlement is RE-DERIVED FROM STRIPE and never
 * copied from the presented token: a cancelled customer holding a valid, in-good-standing token
 * from last month must not be able to replay it into continued access. Several tests below deliver
 * a token whose payload claims tier_2 or a far-future expiry and assert the response ignores it.
 */
const subscriptionsListMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({ subscriptions: { list: subscriptionsListMock } }),
}));

const ORIGINAL_PRIVATE_KEY = process.env.LICENSE_SIGNING_PRIVATE_KEY;
const DAY = 60 * 60 * 24;

function tokenFor(overrides: Partial<LicensePayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return issueLicense(
    {
      licenseKey: 'whk_live_refreshtest',
      tier: 'tier_1',
      customerId: 'cus_test_123',
      issuedAt: now - 31 * DAY,
      expiresAt: now - DAY, // expired: the normal state of a dashboard asking for a refresh
      ...overrides,
    },
    TEST_PRIVATE_KEY,
  ).token;
}

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test_1',
    status: 'active',
    items: { data: [{ price: { id: 'price_tier1_monthly', recurring: { interval: 'month' } } }] },
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/license/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/license/refresh', () => {
  beforeEach(() => {
    subscriptionsListMock.mockReset();
    process.env.LICENSE_SIGNING_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = ORIGINAL_PRIVATE_KEY;
    vi.restoreAllMocks();
  });

  it('returns 400 when licenseToken is missing', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    expect(subscriptionsListMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparsable body', async () => {
    const req = new NextRequest('http://localhost/api/license/refresh', {
      method: 'POST',
      body: 'not json',
    });
    expect((await POST(req)).status).toBe(400);
    expect(subscriptionsListMock).not.toHaveBeenCalled();
  });

  it('returns 503 without touching Stripe when no signing key is configured', async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(postRequest({ licenseToken: tokenFor() }));

    expect(res.status).toBe(503);
    expect(subscriptionsListMock).not.toHaveBeenCalled();
  });

  it('rejects a token signed by a different key — no forging a refresh', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const attackerKey = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    }).privateKey;
    const now = Math.floor(Date.now() / 1000);
    const forged = issueLicense(
      {
        licenseKey: 'whk_live_forged',
        tier: 'tier_2',
        customerId: 'cus_someone_elses',
        issuedAt: now,
        expiresAt: now + DAY,
      },
      attackerKey,
    ).token;

    const res = await POST(postRequest({ licenseToken: forged }));

    expect(res.status).toBe(401);
    expect(subscriptionsListMock).not.toHaveBeenCalled();
  });

  it('accepts an EXPIRED token and issues a fresh one — the entire point of the route', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription()] });

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { licenseToken?: string; tier?: string; expiresAt?: string };

    expect(res.status).toBe(200);
    expect(json.licenseToken).toBeTruthy();

    // The returned token must verify as currently VALID against this deployment's own key.
    const verified = verifyLicense(json.licenseToken!, derivePublicKeyPem(TEST_PRIVATE_KEY));
    expect(verified.valid).toBe(true);
    expect(verified.payload?.customerId).toBe('cus_test_123');
    expect(new Date(json.expiresAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('looks up subscriptions for the customer named in the signed payload', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription()] });

    await POST(postRequest({ licenseToken: tokenFor({ customerId: 'cus_specific_42' }) }));

    expect(subscriptionsListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_specific_42' }),
    );
  });

  it('mints a NEW licenseKey rather than reusing the presented one', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription()] });

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { licenseToken: string };
    const verified = verifyLicense(json.licenseToken, derivePublicKeyPem(TEST_PRIVATE_KEY));

    expect(verified.payload?.licenseKey).not.toBe('whk_live_refreshtest');
    expect(verified.payload?.licenseKey).toMatch(/^whk_live_[0-9a-f]{32}$/);
  });

  it('refuses a cancelled customer with 402 — a stale token cannot be replayed into access', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription({ status: 'canceled' })] });

    // A token from when this customer was in perfectly good standing, still unexpired.
    const now = Math.floor(Date.now() / 1000);
    const res = await POST(
      postRequest({ licenseToken: tokenFor({ issuedAt: now, expiresAt: now + 30 * DAY }) }),
    );
    const json = (await res.json()) as { reason?: string };

    expect(res.status).toBe(402);
    expect(json.reason).toBe('no_active_subscription');
  });

  it('refuses an unpaid subscription and a customer with no subscriptions at all', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription({ status: 'unpaid' })] });
    expect((await POST(postRequest({ licenseToken: tokenFor() }))).status).toBe(402);

    subscriptionsListMock.mockResolvedValue({ data: [] });
    expect((await POST(postRequest({ licenseToken: tokenFor() }))).status).toBe(402);
  });

  it('still refreshes a past_due customer — mid-dunning is not a lockout', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription({ status: 'past_due' })] });

    const res = await POST(postRequest({ licenseToken: tokenFor() }));

    expect(res.status).toBe(200);
  });

  it('derives expiry from the live subscription interval, not the old token', async () => {
    subscriptionsListMock.mockResolvedValue({
      data: [
        subscription({
          items: {
            data: [{ price: { id: 'price_tier1_annual', recurring: { interval: 'year' } } }],
          },
        }),
      ],
    });

    // Presented token was monthly; the customer has since switched to annual.
    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { expiresAt: string };

    const daysOut = (new Date(json.expiresAt).getTime() - Date.now()) / (1000 * DAY);
    expect(daysOut).toBeGreaterThan(300);
  });

  it('preserves boundDomain across a refresh so the reuse signal keeps working', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription()] });

    const res = await POST(
      postRequest({ licenseToken: tokenFor({ boundDomain: 'acme.example.com' }) }),
    );
    const json = (await res.json()) as { licenseToken: string };
    const verified = verifyLicense(json.licenseToken, derivePublicKeyPem(TEST_PRIVATE_KEY));

    expect(verified.payload?.boundDomain).toBe('acme.example.com');
  });

  it('returns 502 without leaking Stripe internals when the lookup throws', async () => {
    subscriptionsListMock.mockRejectedValue(new Error('sk_live_super_secret_detail'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).not.toContain('sk_live_super_secret_detail');
  });
});
