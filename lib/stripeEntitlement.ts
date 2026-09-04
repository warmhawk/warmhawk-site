import { getStripeClient } from './stripe';

/**
 * Live revocation check for the registry pull-token issuer (app/api/registry/token/route.ts) only.
 *
 * warmhawk-site has no database of its own (docker-compose.deploy.yml: "Single stateless service,
 * no database/cache of its own"). Stripe's live subscription status is already this app's only
 * source of truth for entitlement -- app/api/license/refresh/route.ts re-derives tier/expiry from a
 * live `subscriptions.list` call rather than trusting stored state. This reuses that same pattern
 * instead of introducing a webhook-driven "revoked license ids" store, which would be the first
 * piece of persistent state this app has ever needed.
 *
 * Deliberately a defense-in-depth layer, not the primary access control -- signature + expiry
 * (`verifyLicense`) already gate an unauthorized pull. This just closes the window between a
 * cancellation/refund and the license's own `expiresAt` (up to ~13 months on an annual plan): a
 * cancelled subscription stops minting new registry tokens (and therefore new pulls/updates) within
 * one token TTL, instead of only once the license itself expires.
 *
 * Scoped ONLY to the registry-token route -- NOT `/api/portal` or `/api/license/refresh`, which must
 * stay reachable by a lapsed customer so they can get to billing.
 */

/** Mirrors app/api/license/refresh/route.ts's own set exactly (`past_due` included so a card being
 *  retried mid-dunning doesn't stop image pulls) -- kept as a separate local definition rather than
 *  a shared import since the two routes' Stripe calls differ (this one needs no price expansion). */
const ENTITLING_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due']);

export async function isCustomerEntitled(customerId: string): Promise<boolean> {
  try {
    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    return subscriptions.data.some((sub) => ENTITLING_STATUSES.has(sub.status));
  } catch (error) {
    // Fail OPEN. This check sits on top of an already-strict signature+expiry verification -- a
    // Stripe outage must not take down every customer's registry pulls over a defense-in-depth
    // layer. The caller logs nothing further; this is the only place that needs to.
    console.error(
      'Stripe entitlement lookup failed during registry token issuance -- allowing the pull',
      error,
    );
    return true;
  }
}
