import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, STRIPE_PRICE_IDS, type BillingInterval } from '@/lib/stripe';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Creates a Stripe Checkout Session for Tier 1 (Self-Hosted Pro).
 *
 * Per Phase 4 (Commercial Licensing, Billing, Onboarding & Account
 * Security): "Stripe integration in warmhawk-site's checkout flow for
 * Tier 1 subscriptions, including a second Stripe Price for annual
 * billing" and "Stripe webhook -> license issuance" (see
 * /api/stripe/webhook). This route only builds the Checkout Session
 * request against Stripe's documented shape — it is never invoked against
 * a real Stripe account from this build/test environment.
 *
 * Body: { interval: "monthly" | "annual" }
 */
export async function POST(request: NextRequest) {
  let interval: BillingInterval = 'monthly';
  try {
    const body = (await request.json()) as { interval?: BillingInterval };
    if (body.interval === 'annual') interval = 'annual';
  } catch {
    // No body / not JSON — default to monthly.
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
      success_url: `${siteConfig.url}/compare/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteConfig.url}/compare/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // 30-day money-back guarantee (Monetization & Tiering Strategy) is a
      // documented refund policy + a founder-executed Stripe refund flow,
      // not a Checkout-time discount — deliberately not modeled as a
      // trial/coupon here.
      metadata: {
        // Wire-format tier literal (matches `LicensePayload.tier` in lib/license.ts) — this route
        // only ever sells Tier 1 (Self-Hosted Pro) self-serve; Tier 2 (Enterprise DFY) is a
        // custom-scoped engagement sold via the "Talk to us" contact flow, not this Checkout
        // Session. (V12 fix: this used to be the marketing-display literal 'self-hosted-pro',
        // which doesn't match the license payload's tier union at all.)
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
