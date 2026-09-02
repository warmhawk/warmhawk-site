import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { POST } from './route';
import { getStripeClient } from '@/lib/stripe';
import { issueLicense, type LicensePayload } from '@/lib/license';

/**
 * REAL Stripe test-mode coverage for /api/portal — the route behind /account/billing.
 *
 * WHY THIS EXISTS AND THE MOCKED SUITE ISN'T ENOUGH. `billingPortal.sessions.create` fails at
 * runtime unless the Customer Portal has been configured in the Stripe dashboard for this mode
 * ("No configuration provided and your test mode default configuration has not been created").
 * That is pure account setup — no amount of code review or mocking surfaces it — and it is
 * exactly the kind of thing that only shows up when the first locked-out customer clicks "Manage
 * billing". A red run here means the portal needs configuring in the Stripe dashboard, not that
 * the route is wrong.
 *
 * Self-SKIPS rather than fails when the secrets aren't provisioned, matching this repo's other
 * integration files.
 */
const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
const canRun =
  Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) && Boolean(privateKeyPem);

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!canRun)('POST /api/portal (real Stripe test-mode API)', () => {
  let stripe: Stripe;
  let customerId: string;

  function tokenFor(overrides: Partial<LicensePayload> = {}): string {
    const now = Math.floor(Date.now() / 1000);
    return issueLicense(
      {
        licenseKey: 'whk_live_integrationportal', // gitleaks:allow — fixture id, not a real key
        customerId,
        tier: 'tier_1',
        issuedAt: now,
        expiresAt: now + 60 * 60 * 24 * 31,
        ...overrides,
      },
      privateKeyPem!,
    ).token;
  }

  beforeAll(async () => {
    stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email: 'integration+portal@warmhawk.com',
      description: 'warmhawk-site test:integration — billing portal, safe to delete',
    });
    customerId = customer.id;
  }, 60_000);

  afterAll(async () => {
    if (customerId) await stripe.customers.del(customerId).catch(() => {});
  }, 60_000);

  it('opens a real Customer Portal session for a validly-signed license', async () => {
    const res = await POST(postRequest({ licenseToken: tokenFor() }));
    const json = (await res.json()) as { url?: string; error?: string };

    expect(res.status, json.error).toBe(200);
    expect(json.url).toMatch(/^https:\/\/billing\.stripe\.com\//);
  }, 30_000);

  it('opens one for an EXPIRED license too — a lapsed subscriber is the main user of this route', async () => {
    const now = Math.floor(Date.now() / 1000);
    const res = await POST(
      postRequest({
        licenseToken: tokenFor({
          issuedAt: now - 60 * 60 * 24 * 40,
          expiresAt: now - 60 * 60 * 24 * 9,
        }),
      }),
    );
    const json = (await res.json()) as { url?: string; error?: string };

    expect(res.status, json.error).toBe(200);
    expect(json.url).toMatch(/^https:\/\/billing\.stripe\.com\//);
  }, 30_000);

  it('never opens one from a raw customer id — the pre-audit vulnerability, against real Stripe', async () => {
    // This body is precisely what the route used to accept. Stripe would happily create a portal
    // session for it; the route must refuse before ever asking.
    const res = await POST(postRequest({ stripeCustomerId: customerId }));
    const json = (await res.json()) as { url?: string; error?: string };

    expect(res.status).toBe(400);
    expect(json.url).toBeUndefined();
  }, 30_000);
});
