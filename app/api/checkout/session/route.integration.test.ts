import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { STRIPE_PRICE_IDS } from '@/lib/stripe';

/**
 * REAL Stripe test-mode integration coverage for app/api/checkout/session/route.ts — unlike
 * route.test.ts (mocked, and still the file this repo's plain unit-test policy governs — see
 * lib/stripe.ts's header comment), this file imports the real `@/lib/stripe` and makes a genuine
 * network call to Stripe's TEST-MODE Checkout Sessions API. The project owner explicitly overrode
 * the "no live network calls" build policy for this new test:integration tier only.
 *
 * Self-skips (not fails) whenever a real `sk_test_` key isn't configured, so this file is a safe
 * no-op under `npm test` / `npm run test:unit` and in any CI job that hasn't provisioned the new
 * STRIPE_SECRET_KEY / STRIPE_PRICE_* secrets yet (see .env/.env.example's CI notes on those vars).
 */
const hasRealStripeTestKey = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasRealStripeTestKey)(
  'POST /api/checkout/session (real Stripe test-mode API)',
  () => {
    it('creates a real monthly Checkout Session and returns a checkout.stripe.com URL', async () => {
      const res = await POST(postRequest({ interval: 'monthly' }));
      const json = (await res.json()) as { url?: string; error?: string };

      expect(res.status, json.error).toBe(200);
      expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    });

    it('creates a real annual Checkout Session and returns a checkout.stripe.com URL', async () => {
      const res = await POST(postRequest({ interval: 'annual' }));
      const json = (await res.json()) as { url?: string; error?: string };

      expect(res.status, json.error).toBe(200);
      expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    });
  },
);

// The "price ID not configured" 500 branch never touches the network (route.ts returns before
// ever calling Stripe — see the `if (!priceId)` check there), so it's genuinely safe to run
// unconditionally rather than gated behind hasRealStripeTestKey. It is NOT covered by the existing
// mocked app/api/checkout/session/route.test.ts (that file's `@/lib/stripe` mock always supplies a
// price id), so this is new coverage, not a duplicate.
//
// Nuance worth flagging: `STRIPE_PRICE_IDS` (lib/stripe.ts) is a module-level constant read from
// `process.env` once at import time, not a live env read — so this test can't force the branch by
// deleting the env var mid-test (that would have no effect on the already-imported constant). It
// instead runs only in the state where the price id is ALREADY unconfigured (the default state
// before the project owner provisions real secrets), which is exactly the "self-skip until secrets
// exist" posture the rest of this file follows too.
describe.skipIf(Boolean(STRIPE_PRICE_IDS.selfHostedProMonthly))(
  'POST /api/checkout/session (price ID not configured — no network required)',
  () => {
    it('returns 500 without calling Stripe when the monthly price id is unconfigured', async () => {
      const res = await POST(postRequest({ interval: 'monthly' }));
      const json = (await res.json()) as { error?: string };

      expect(res.status).toBe(500);
      expect(json.error).toContain('STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY');
    });
  },
);
