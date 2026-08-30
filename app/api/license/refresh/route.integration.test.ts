import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { POST } from './route';
import { getStripeClient, STRIPE_PRICE_IDS } from '@/lib/stripe';
import {
  issueLicense,
  verifyLicense,
  derivePublicKeyPem,
  type LicensePayload,
} from '@/lib/license';

/**
 * REAL Stripe test-mode coverage for the renewal loop — the half of the subscription lifecycle
 * that route.test.ts can only assert against a mocked `stripe.subscriptions.list`.
 *
 * What this proves that the mocked suite cannot: a license issued for a customer who genuinely
 * has an active subscription in Stripe refreshes, and the SAME license stops refreshing the
 * moment that subscription is actually cancelled. That is the entitlement boundary the whole
 * design rests on — the old token is trusted for `customerId` and nothing else — and it is only
 * meaningful against Stripe's real state machine.
 *
 * Follows the same posture as this repo's other two integration files (checkout/session and
 * stripe/webhook): the project owner explicitly overrode the "no live network calls" build policy
 * for the `test:integration` tier only, and the suite self-SKIPS rather than fails whenever the
 * secrets aren't provisioned, so it is a safe no-op under `npm test` / `npm run test:unit`.
 *
 * Test-mode housekeeping: the customer and subscription created here are torn down in `afterAll`,
 * and the customer's email is namespaced `integration+license-refresh@` so anything left behind by
 * an interrupted run is identifiable in the Stripe dashboard.
 */
const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
const canRun =
  Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) &&
  Boolean(privateKeyPem) &&
  Boolean(STRIPE_PRICE_IDS.selfHostedProMonthly);

/** Stripe's documented always-succeeds test PaymentMethod — no card data ever appears here. */
const TEST_PAYMENT_METHOD = 'pm_card_visa';

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/license/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!canRun)('POST /api/license/refresh (real Stripe test-mode API)', () => {
  let stripe: Stripe;
  let customerId: string;
  let subscriptionId: string;

  /** An already-EXPIRED token for the live customer — the state a dashboard is actually in when it
   *  asks for a refresh, and the one the auth model deliberately still accepts. */
  function expiredTokenFor(overrides: Partial<LicensePayload> = {}): string {
    const now = Math.floor(Date.now() / 1000);
    return issueLicense(
      {
        licenseKey: 'whk_live_integrationrefresh', // gitleaks:allow — fixture id, not a real key
        customerId,
        tier: 'tier_1',
        issuedAt: now - 60 * 60 * 24 * 40,
        expiresAt: now - 60 * 60 * 24 * 9,
        ...overrides,
      },
      privateKeyPem!,
    ).token;
  }

  beforeAll(async () => {
    stripe = getStripeClient();

    const customer = await stripe.customers.create({
      email: 'integration+license-refresh@warmhawk.com',
      description: 'warmhawk-site test:integration — license refresh, safe to delete',
    });
    customerId = customer.id;

    // `attach` mints a real PaymentMethod and returns ITS id — `pm_card_visa` is only an input
    // alias Stripe accepts on the way in, and passing it back as a default fails with "The
    // customer does not have a payment method with the ID pm_...".
    const paymentMethod = await stripe.paymentMethods.attach(TEST_PAYMENT_METHOD, {
      customer: customerId,
    });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: STRIPE_PRICE_IDS.selfHostedProMonthly }],
    });
    subscriptionId = subscription.id;
  }, 60_000);

  afterAll(async () => {
    // Deleting the customer cancels its subscriptions too, but cancel explicitly first so a
    // failure in either step still leaves the other one done.
    if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
    if (customerId) await stripe.customers.del(customerId).catch(() => {});
  }, 60_000);

  it('re-issues a valid, unexpired license for a customer with a live subscription', async () => {
    const res = await POST(postRequest({ licenseToken: expiredTokenFor() }));
    const json = (await res.json()) as { licenseToken?: string; tier?: string; error?: string };

    expect(res.status, json.error).toBe(200);
    expect(json.tier).toBe('tier_1');

    // The returned token must verify against our own public half AND be genuinely unexpired —
    // asserting only "200 with a string" would pass on a token the dashboard then rejects.
    const verified = verifyLicense(json.licenseToken!, derivePublicKeyPem(privateKeyPem!));
    expect(verified.valid).toBe(true);
    expect(verified.payload?.customerId).toBe(customerId);
    expect(verified.payload?.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // A fresh identifier every time, from crypto.randomBytes — never the old one re-signed.
    expect(verified.payload?.licenseKey).toMatch(/^whk_live_[0-9a-f]{32}$/);
    expect(verified.payload?.licenseKey).not.toBe('whk_live_integrationrefresh');
  }, 30_000);

  it('keeps the license bound to the domain it was activated against', async () => {
    const res = await POST(
      postRequest({ licenseToken: expiredTokenFor({ boundDomain: 'dashboard.acme.example' }) }),
    );
    const json = (await res.json()) as { licenseToken?: string; error?: string };

    expect(res.status, json.error).toBe(200);
    const verified = verifyLicense(json.licenseToken!, derivePublicKeyPem(privateKeyPem!));
    expect(verified.payload?.boundDomain).toBe('dashboard.acme.example');
  }, 30_000);

  it('refuses a token whose signature is not ours, without asking Stripe anything', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const foreign = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const foreignPem = foreign.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const now = Math.floor(Date.now() / 1000);
    const forged = issueLicense(
      {
        licenseKey: 'whk_live_forged', // gitleaks:allow — fixture id, not a real key
        customerId,
        // Claims the higher tier, and is not even expired — neither buys anything without the
        // signature, which is the property under test.
        tier: 'tier_2',
        issuedAt: now,
        expiresAt: now + 60 * 60 * 24 * 365,
      },
      foreignPem,
    ).token;

    const res = await POST(postRequest({ licenseToken: forged }));
    expect(res.status).toBe(401);
  }, 30_000);

  // Runs last on purpose: it cancels the subscription this file's earlier tests depend on.
  it('stops refreshing once the subscription is genuinely cancelled', async () => {
    const token = expiredTokenFor();

    // Same token that just worked above — only Stripe's state changes.
    await stripe.subscriptions.cancel(subscriptionId);

    const res = await POST(postRequest({ licenseToken: token }));
    const json = (await res.json()) as { error?: string; reason?: string };

    expect(res.status).toBe(402);
    expect(json.reason).toBe('no_active_subscription');
    // The 402 has to tell a lapsed customer where to actually pay.
    expect(json.error).toContain('/account/billing');
  }, 60_000);
});
