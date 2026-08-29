import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getStripeClient } from '@/lib/stripe';
import { waitForResendEmail } from '@/tests/integration/resendEmail';

/**
 * REAL integration coverage for app/api/stripe/webhook/route.ts — unlike route.test.ts (mocks
 * `@/lib/stripe`, `@/lib/license`, `@/lib/email`; never verifies a real signature), this file
 * imports the route's real dependencies and exercises three genuinely real things end to end:
 *  1. `stripe.webhooks.constructEvent` verifying a REAL signature (via Stripe's own
 *     `generateTestHeaderString` SDK test helper — a documented, offline way to produce a valid
 *     `stripe-signature` header without a live webhook round trip).
 *  2. A REAL RSA-signed license token (`lib/license.ts` is never mocked here).
 *  3. A REAL SMTP send through Resend's relay, verified by polling Resend's own REST API.
 *
 * Project owner explicitly overrode this repo's "no live network calls" build policy for this new
 * test:integration tier (see lib/stripe.ts's / lib/email.ts's header comments, which still govern
 * the *.test.ts unit suite only). Self-skips cleanly whenever the required secrets aren't
 * configured yet, so this is a safe no-op under `npm test` / `npm run test:unit`.
 *
 * IMPORTANT (carried over from the route's own V13 fix comment): `invoice.paid` is the ONLY event
 * that issues a license — `checkout.session.completed` is deliberately not exercised here; that
 * regression case is already covered by the existing mocked route.test.ts.
 */
const hasRealStripeTestKey = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
const canRunLiveWebhookTest =
  hasRealStripeTestKey &&
  Boolean(process.env.STRIPE_WEBHOOK_SECRET) &&
  Boolean(process.env.LICENSE_SIGNING_PRIVATE_KEY) &&
  Boolean(process.env.RESEND_API_KEY);

// Resend's documented test sandbox recipient — deliveries here are retrievable via the Resend API
// but never reach a real inbox, matching this test's need for a real-but-harmless email target.
const RESEND_TEST_RECIPIENT = 'delivered@resend.dev';

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
        customer_email: RESEND_TEST_RECIPIENT,
        lines: { data: [{ price: { id: process.env.STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY } }] },
        metadata: { billingInterval: 'monthly' },
        ...overrides,
      },
    },
  };
}

describe.skipIf(!canRunLiveWebhookTest)(
  'POST /api/stripe/webhook (real signature verification + real license + real Resend send)',
  () => {
    const ORIGINAL_SMTP = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    };

    beforeAll(() => {
      // Resend's documented SMTP relay convention (host/user are fixed, non-secret values — only
      // the password is a real credential, sourced from env, never hardcoded here).
      process.env.SMTP_HOST = 'smtp.resend.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'resend';
      process.env.SMTP_PASSWORD = process.env.RESEND_API_KEY;
    });

    afterAll(() => {
      process.env.SMTP_HOST = ORIGINAL_SMTP.host;
      process.env.SMTP_PORT = ORIGINAL_SMTP.port;
      process.env.SMTP_USER = ORIGINAL_SMTP.user;
      process.env.SMTP_PASSWORD = ORIGINAL_SMTP.password;
    });

    it('verifies a real signature, issues a real license, and really emails it via Resend', async () => {
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

      const res = await POST(request);
      const json = (await res.json()) as { received?: boolean; error?: string };
      expect(res.status, json.error).toBe(200);
      expect(json.received).toBe(true);

      const email = await waitForResendEmail({
        apiKey: process.env.RESEND_API_KEY!,
        toEmail: RESEND_TEST_RECIPIENT,
        subjectContains: 'Your WarmHawk install command',
        timeoutMs: 30000,
      });
      expect(
        email,
        `No license email arrived at ${RESEND_TEST_RECIPIENT} within 30s`,
      ).not.toBeNull();

      // lib/email.ts's buildInstallCommand() shape: `curl -fsSL https://warmhawk.com/install |
      // bash -s -- --license <token> --domain <your-domain> --owner-email <email>`.
      const installCommandMatch = email!.text.match(
        /--license (\S+) --domain <your-domain> --owner-email/,
      );
      expect(
        installCommandMatch,
        `Install command not found in email body:\n${email!.text}`,
      ).not.toBeNull();

      // Note: generateLicenseKey() (lib/license.ts) always issues a `whk_live_...`-shaped
      // identifier regardless of environment — left alone per the task constraints, since it's the
      // one canonical issuance implementation. The token this test extracts is real-shaped but
      // harmless: it is signed with whatever LICENSE_SIGNING_PRIVATE_KEY this test run configured
      // (a test keypair — see .env/.env.example) and is never activated against a real product install.
      const licenseToken = installCommandMatch![1];
      expect(licenseToken).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });
  },
);
