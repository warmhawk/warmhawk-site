import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, STRIPE_PRICE_IDS, type BillingInterval } from '@/lib/stripe';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Creates a Stripe Checkout Session for Tier 1 (Self-Hosted Pro, recurring) or Tier 2 (Enterprise
 * DFY, one-time setup fee).
 *
 * Per Phase 4 (Commercial Licensing, Billing, Onboarding & Account
 * Security): "Stripe integration in warmhawk-site's checkout flow for
 * Tier 1 subscriptions, including a second Stripe Price for annual
 * billing" and "Stripe webhook -> license issuance" (see
 * /api/stripe/webhook). This route only builds the Checkout Session
 * request against Stripe's documented shape — it is never invoked against
 * a real Stripe account from this build/test environment.
 *
 * 2026-09-03: Tier 2 was repriced from a custom-scoped "Talk to us" engagement to a flat $1,999
 * one-time setup fee, sold self-serve like Tier 1. Added a `tier` field to the request body so
 * this one route now covers both — `tier: 'tier_2'` builds a `mode: 'payment'` Session instead of
 * `mode: 'subscription'`. Existing callers that only send `{ interval }` (Tier 1's CheckoutButtons)
 * are unaffected: `tier` defaults to `'tier_1'`.
 *
 * Body: { tier?: "tier_1" | "tier_2", interval?: "monthly" | "annual" } — `interval` is read only
 * for `tier_1`; Tier 2 has no billing interval.
 */
export async function POST(request: NextRequest) {
  let interval: BillingInterval = 'monthly';
  let tier: 'tier_1' | 'tier_2' = 'tier_1';
  try {
    const body = (await request.json()) as { interval?: BillingInterval; tier?: string };
    if (body.interval === 'annual') interval = 'annual';
    if (body.tier === 'tier_2') tier = 'tier_2';
  } catch {
    // No body / not JSON — default to Tier 1 monthly.
  }

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;

  if (tier === 'tier_2') {
    const priceId = STRIPE_PRICE_IDS.tier2;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured for this environment. Set STRIPE_PRICE_TIER_2.' },
        { status: 500 },
      );
    }

    try {
      const stripe = getStripeClient();

      // `mode: 'payment'` — a single one-time charge, no subscription created. Unlike
      // `mode: 'subscription'` (which always attaches a Customer automatically),
      // `customer_creation: 'always'` is required here so the webhook has a Customer object to
      // persist the issued license onto (see app/api/stripe/webhook/route.ts's
      // `persistLicenseOnCustomer`) — without it, Stripe only creates a Customer for
      // one-time-payment mode when the buyer is later billed again, which never happens for a
      // true one-time fee.
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_creation: 'always',
        success_url: `${siteOrigin}/checkout?tier=2&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteOrigin}/checkout?tier=2&checkout=cancelled`,
        billing_address_collection: 'auto',
        metadata: {
          // Read directly by the webhook's `checkout.session.completed` branch — Tier 2's one-time
          // payment never generates an Invoice, so unlike Tier 1 there is no `invoice.paid` event
          // to resolve tier/expiry from. See app/api/stripe/webhook/route.ts.
          tier: 'tier_2',
        },
      });

      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error('Stripe Checkout Session creation failed', error);
      return NextResponse.json({ error: 'Unable to start checkout right now.' }, { status: 502 });
    }
  }

  const priceId =
    interval === 'annual'
      ? STRIPE_PRICE_IDS.selfHostedProAnnual
      : STRIPE_PRICE_IDS.selfHostedProMonthly;

  if (!priceId) {
    return NextResponse.json(
      {
        error:
          'Stripe price ID not configured for this environment. Set ' +
          'STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY / STRIPE_PRICE_SELF_HOSTED_PRO_ANNUAL.',
      },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripeClient();

    // Shape follows Stripe's documented Checkout Session creation API
    // (https://stripe.com/docs/api/checkout/sessions/create). `mode:
    // "subscription"` for Tier 1's recurring monthly/annual price;
    // success/cancel URLs point back at the pricing page's checkout
    // anchor per the spec's "self-serve billing, not support-ticket
    // billing" goal.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Redirect targets, unlike siteConfig.url's other uses in this repo (sitemap/canonical/OG
      // URLs, which must always be the real production domain regardless of what's serving the
      // request) — these have to send the browser back to whichever environment the checkout
      // actually started from, or a stage/local checkout bounces the visitor to production.
      // NEXT_PUBLIC_SITE_URL is set per-environment in every .env* file for exactly this (was
      // documented but unused until found via a stage/local human-journey test 2026-08-28).
      success_url: `${siteOrigin}/compare/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteOrigin}/compare/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // 30-day money-back guarantee (Monetization & Tiering Strategy) is a
      // documented refund policy + a founder-executed Stripe refund flow,
      // not a Checkout-time discount — deliberately not modeled as a
      // trial/coupon here.
      metadata: {
        // Wire-format tier literal (matches `LicensePayload.tier` in lib/license.ts). (V12 fix:
        // this used to be the marketing-display literal 'self-hosted-pro', which doesn't match the
        // license payload's tier union at all.)
        tier: 'tier_1',
        billingInterval: interval,
      },
      // V13 fix: the webhook now issues a license from `invoice.paid` alone (see
      // app/api/stripe/webhook/route.ts's header comment), and a Checkout Session's own
      // `metadata` does NOT propagate onto the invoices Stripe generates for the resulting
      // subscription — only `subscription_data.metadata` does. Duplicated here (not a
      // replacement for the metadata above, which Stripe still needs for the Session itself)
      // so `invoice.metadata.billingInterval` resolves correctly on both the first invoice and
      // every renewal, not just the initial checkout.
      subscription_data: {
        metadata: {
          tier: 'tier_1',
          billingInterval: interval,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Never leak Stripe error internals to the client; log server-side in
    // a real deployment (see docs/stripe-webhooks troubleshooting guide).
    console.error('Stripe Checkout Session creation failed', error);
    return NextResponse.json({ error: 'Unable to start checkout right now.' }, { status: 502 });
  }
}
