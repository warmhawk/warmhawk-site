import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { issueLicense, type LicensePayload } from '@/lib/license';
import { TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * Tests app/api/portal/route.ts — Stripe Customer Portal session creation. Mocks `@/lib/stripe`
 * so this never hits a live Stripe API, following the same convention as the checkout/session and
 * stripe/webhook route tests.
 *
 * These tests were rewritten by the 2026-08-30 go-live audit alongside the route itself: the old
 * suite asserted a caller could open a portal session by posting a bare `stripeCustomerId`, which
 * is exactly the unauthenticated access the fix removes. The route now requires a signed license
 * token naming the customer, so the interesting cases are the ones below — a forged/garbage token
 * is rejected, an EXPIRED one is deliberately accepted (a lapsed subscriber coming to pay again is
 * this route's primary user), and the customer opened is always the one named in the signed
 * payload rather than anything the caller supplied.
 */
const createPortalSessionMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({ billingPortal: { sessions: { create: createPortalSessionMock } } }),
}));

const ORIGINAL_PRIVATE_KEY = process.env.LICENSE_SIGNING_PRIVATE_KEY;

function tokenFor(overrides: Partial<LicensePayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return issueLicense(
    {
      licenseKey: 'whk_live_portaltest',
      tier: 'tier_1',
      customerId: 'cus_test_123',
      issuedAt: now,
      expiresAt: now + 60 * 60 * 24 * 31,
      ...overrides,
    },
    TEST_PRIVATE_KEY,
  ).token;
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal', () => {
  beforeEach(() => {
    createPortalSessionMock.mockReset();
    process.env.LICENSE_SIGNING_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = ORIGINAL_PRIVATE_KEY;
    vi.restoreAllMocks();
  });

  it('returns 400 when licenseToken is missing', async () => {
    const res = await POST(postRequest({}));
    const json = (await res.json()) as { error?: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain('licenseToken');
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparsable body', async () => {
    const req = new NextRequest('http://localhost/api/portal', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('returns 503 without touching Stripe when no signing key is configured', async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(503);
    expect(json.error).toContain('not configured');
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('rejects a garbage token with 401 and never reaches Stripe', async () => {
    const res = await POST(postRequest({ licenseToken: 'whk_live_a1b2c3d4' }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(401);
    // The error must teach the identifier-vs-token distinction — pasting the short whk_live_ value
    // is the single most likely way a real customer lands here.
    expect(json.error).toContain('whk_live_');
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('rejects a token signed by a different key with 401 — the core authentication guarantee', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const attackerKey = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    }).privateKey;

    // A well-formed token naming a real customer, but minted by someone who is not this
    // deployment. If this ever passed, the route would be back to its pre-audit behaviour.
    const now = Math.floor(Date.now() / 1000);
    const forged = issueLicense(
      {
        licenseKey: 'whk_live_forged',
        tier: 'tier_1',
        customerId: 'cus_someone_elses',
        issuedAt: now,
        expiresAt: now + 3600,
      },
      attackerKey,
    ).token;

    const res = await POST(postRequest({ licenseToken: forged }));

    expect(res.status).toBe(401);
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('opens the portal for the customer named in the signed token', async () => {
    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { url?: string };

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://billing.stripe.com/session/test');
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_123' }),
    );
  });

  it('ignores a stripeCustomerId in the body — only the signed payload decides', async () => {
    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });

    const res = await POST(
      postRequest({ licenseToken: tokenFor(), stripeCustomerId: 'cus_victim_999' }),
    );

    expect(res.status).toBe(200);
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_123' }),
    );
  });

  it('accepts an EXPIRED token — a lapsed subscriber is exactly who needs the portal', async () => {
    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });

    const now = Math.floor(Date.now() / 1000);
    const expired = tokenFor({ issuedAt: now - 60 * 60 * 24 * 60, expiresAt: now - 60 * 60 * 24 });

    const res = await POST(postRequest({ licenseToken: expired }));

    expect(res.status).toBe(200);
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_123' }),
    );
  });

  it('returns 502 and never leaks Stripe’s internal error message when session creation throws', async () => {
    createPortalSessionMock.mockRejectedValue(new Error('sk_live_super_secret_detail'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).not.toContain('sk_live_super_secret_detail');
  });
});
