import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getStripeClient } from '@/lib/stripe';

/**
 * REAL integration coverage for app/api/stripe/webhook/route.ts — unlike route.test.ts (mocks
 * `@/lib/stripe`, `@/lib/license`, `@/lib/email`; never verifies a real signature), this file
 * imports the route's real dependencies and exercises two genuinely real things end to end:
 *  1. `stripe.webhooks.constructEvent` verifying a REAL signature (via Stripe's own
 *     `generateTestHeaderString` SDK test helper — a documented, offline way to produce a valid
 *     `stripe-signature` header without a live webhook round trip).
 *  2. A REAL RSA-signed license token (`lib/license.ts` is never mocked here).
 *
 * 🔴 KNOWN GAP (2026-09-06 email-provider migration): this used to also verify a real send by
 * polling the previous provider's REST API for the delivered body, using its documented sandbox
 * recipient. ZeptoMail has no equivalent — its own sent-log API returns metadata only, never the
 * body (confirmed against the live API; jitterflow-core-app hit the same wall and worked around it
 * by adding its own send-side capture endpoint, `GET /v1/test-mail` — see that repo's
 * `tests/human-journeys/capturedEmail.ts`). Replicating that capture-endpoint pattern here is a
 * separate, not-yet-built follow-up. Until then this test only proves the webhook accepts the
 * event and issues a real license; it does not prove an email actually left the building. Do not
 * silently restore a provider-shaped body assertion here — the old provider is fully retired, not
 * run in parallel.
 *
 * IMPORTANT (carried over from the route's own V13 fix comment): `invoice.paid` is the ONLY event
 * that issues a license, for both Tier 1 and Tier 2 — the route does not act on
 * `checkout.session.completed` at all. This test only exercises Tier 1's shape; Tier 2's
 * metadata-based tier resolution is covered by the mocked route.test.ts instead.
 */
const hasRealStripeTestKey = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
const canRunLiveWebhookTest =
  hasRealStripeTestKey &&
  Boolean(process.env.STRIPE_WEBHOOK_SECRET) &&
  Boolean(process.env.LICENSE_SIGNING_PRIVATE_KEY) &&
  Boolean(process.env.ZEPTOMAIL_TOKEN);

// No real-inbox requirement: ZeptoMail's read-back API never exposes a delivered message's body
// regardless of recipient, so any harmless-looking recipient works.
const TEST_RECIPIENT = 'integration-test@warmhawk.com';

function invoicePaidEventBody(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_integration_test_${now}`,
    object: 'event',
    type: 'invoice.paid',
    api_version: '2024-06-20',
    created: now,
    data: {
      object: {
        id: `in_integration_test_${now}`,
        object: 'invoice',
        customer: 'cus_integration_test',
        customer_email: TEST_RECIPIENT,
        lines: { data: [{ price: { id: process.env.STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY } }] },
        metadata: { billingInterval: 'monthly' },
        ...overrides,
      },
    },
  };
}

describe.skipIf(!canRunLiveWebhookTest)(
  'POST /api/stripe/webhook (real signature verification + real license + real ZeptoMail send)',
  () => {
    it('verifies a real signature, issues a real license, and really sends it via ZeptoMail', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      const payload = JSON.stringify(invoicePaidEventBody());

      // Real Stripe SDK helper — produces a genuinely valid `stripe-signature` header offline
      // (no network call for the signing itself), so the route's real
      // `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` verification path is
      // exercised for real, unlike route.test.ts's mocked `constructEvent`.
      const stripe = getStripeClient();
      const signatureHeader = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': signatureHeader },
        body: payload,
      });

      // The route's `invoice.paid` handler awaits `emailSender.sendLicenseEmail` directly, inside
      // the same outer try/catch that turns any thrown error into a non-200 response (see
      // route.ts) — so a 200 here already proves ZeptoMail accepted the real send, not merely that
      // the webhook was well-formed. What it can no longer prove, absent the capture-endpoint
      // follow-up described above, is what the email actually said.
      const res = await POST(request);
      const json = (await res.json()) as { received?: boolean; error?: string };
      expect(res.status, json.error).toBe(200);
      expect(json.received).toBe(true);
    });
  },
);
