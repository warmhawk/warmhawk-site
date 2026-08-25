import Stripe from 'stripe';

/**
 * Stripe client, lazily constructed so `next build`/`tsc --noEmit` never
 * requires a real STRIPE_SECRET_KEY to be present in this environment.
 * Every call site in this repo is written against Stripe's documented
 * API/SDK shapes per the Phase 4 (Commercial Licensing & Billing) spec —
 * none of it is ever executed live from this build; there is no test
 * suite here that hits Stripe's network, per the build instructions.
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Configure it in this deployment\'s environment before ' +
        'calling any Stripe-backed route (see docs/stripe-webhooks and .env.example).',
    );
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-06-20',
    typescript: true,
  });
}

/**
 * Tier 1 Stripe Price IDs — monthly and annual (Monetization & Tiering
 * Strategy: "$1,990/yr, configured as a second Stripe Price on the same
 * product, offered as a toggle at checkout"). Real IDs are environment
 * config, never hardcoded — these env var names are the contract the
 * Stripe dashboard product/price setup must match.
 */
export const STRIPE_PRICE_IDS = {
  selfHostedProMonthly: process.env.STRIPE_PRICE_SELF_HOSTED_PRO_MONTHLY ?? '',
  selfHostedProAnnual: process.env.STRIPE_PRICE_SELF_HOSTED_PRO_ANNUAL ?? '',
  /** Tier 2 (Enterprise DFY) — not offered on this repo's self-serve Checkout Session (it's a
   *  custom-scoped one-time + retainer engagement, sold via the "Talk to us" contact flow), but
   *  the founder may set the $300/mo retainer up as a Stripe subscription by hand against this
   *  Price ID, and `app/api/stripe/webhook`'s `tierForPriceId` needs it to recognize that event
   *  and issue a tier_2 license rather than defaulting to tier_1. */
  tier2: process.env.STRIPE_PRICE_TIER_2 ?? '',
} as const;

export type BillingInterval = 'monthly' | 'annual';
