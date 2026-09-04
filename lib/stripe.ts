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
      "STRIPE_SECRET_KEY is not set. Configure it in this deployment's environment before " +
        'calling any Stripe-backed route (see docs/stripe-webhooks and .env/.env.example).',
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
  /** Tier 2 (Enterprise DFY)'s one-time $1,999 setup fee ONLY — a real ONE-TIME (not recurring)
   *  Stripe Price. Sold self-serve through `app/api/checkout/session` as a second line item
   *  alongside `selfHostedProMonthly` in the SAME `mode: 'subscription'` Checkout Session: Tier 2
   *  pays this one-time fee at checkout, then the identical $199/mo software fee Tier 1 customers
   *  pay, for as long as the subscription runs. 2026-09-03/04 repricing: Tier 2 used to be a
   *  custom-scoped one-time + $300/mo retainer engagement sold only through the "Talk to us" contact
   *  flow, with this Price ID reserved for the founder to hand-configure that retainer as a Stripe
   *  subscription. The retainer is gone and the monthly fee dropped to match Tier 1's own $199/mo —
   *  this Price ID now names just the one-time setup-fee Price, billed once on the first invoice of
   *  an otherwise-ordinary subscription. Kept the same env var name (`STRIPE_PRICE_TIER_2`) rather
   *  than introducing a new one, since it's already a required var in docker/docker-compose.deploy.yml. */
  tier2: process.env.STRIPE_PRICE_TIER_2 ?? '',
} as const;

export type BillingInterval = 'monthly' | 'annual';
