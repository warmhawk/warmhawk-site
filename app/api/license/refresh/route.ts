import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import {
  authenticateLicenseToken,
  generateLicenseKey,
  issueLicense,
  computeExpiry,
  type LicensePayload,
} from '@/lib/license';

/**
 * Re-issues a license for a still-paying customer — the missing half of the subscription
 * lifecycle.
 *
 * THE PROBLEM THIS SOLVES (2026-08-30 go-live audit finding L1). A monthly license expires 31 days
 * after issuance. `invoice.paid` on the next cycle mints a brand-new token and emails it, but a
 * running self-hosted dashboard had no way to apply it: `/api/license/activate` in
 * warmhawk-enterprise-operator is only ever called by `install.sh`, `LicenseGate` re-validates the
 * STORED key and never fetches a newer one, and `/docs/license-activation` states plainly that no
 * paste-in screen exists. The customer's only recourse was to SSH into their own server, edit
 * `.env` and restart — every month, inside a roughly one-day window — or be locked out of the
 * dashboard they are actively paying for.
 *
 * THE AUTH MODEL. The caller presents its CURRENT license token, which
 * `authenticateLicenseToken` accepts even once expired (that is the whole point — a dashboard
 * asking for a refresh is, by definition, holding a token at or past its expiry). A valid RSA
 * signature proves the caller holds a license this deployment actually issued, and the signed
 * payload names the Stripe customer to check. So there is no new shared secret to provision, no
 * new env var, and no customer-id parameter an attacker could enumerate.
 *
 * ENTITLEMENT IS RE-DERIVED FROM STRIPE, NOT COPIED FROM THE OLD TOKEN. The old payload is trusted
 * only for `customerId` — never for tier or expiry. Both are recomputed from the customer's live
 * Stripe subscription, so a cancelled, unpaid or downgraded customer cannot refresh their way into
 * continued access by replaying a token from when they were in good standing.
 */

/** Subscription states that still entitle a customer to a working dashboard. `past_due` is
 *  deliberately included: Stripe is still retrying the card, and locking someone out mid-dunning
 *  over a transient decline is the "jarring lockout" the daily-revalidation design exists to
 *  avoid. A genuinely failed subscription lands in `canceled`/`unpaid`, which are excluded. */
const ENTITLING_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due']);

export async function POST(request: NextRequest) {
  let licenseToken: string | undefined;
  try {
    const body = (await request.json()) as { licenseToken?: string };
    licenseToken = body.licenseToken?.trim();
  } catch {
    // fall through to the validation below
  }

  if (!licenseToken) {
    return NextResponse.json({ error: 'licenseToken is required' }, { status: 400 });
  }

  const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    console.error('LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot refresh a license');
    return NextResponse.json(
      { error: 'License issuance is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const existing = authenticateLicenseToken(licenseToken, privateKeyPem);
  if (!existing) {
    return NextResponse.json(
      { error: 'That license token is not valid — its signature did not verify.' },
      { status: 401 },
    );
  }

  let subscriptions: Stripe.ApiList<Stripe.Subscription>;
  try {
    const stripe = getStripeClient();
    subscriptions = await stripe.subscriptions.list({
      customer: existing.customerId,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price'],
    });
  } catch (error) {
    // Never leak Stripe internals; the caller retries on its own schedule.
    console.error('Stripe subscription lookup failed during license refresh', error);
    return NextResponse.json({ error: 'Unable to reach billing right now.' }, { status: 502 });
  }

  const entitling = subscriptions.data.find((sub) => ENTITLING_STATUSES.has(sub.status));
  if (!entitling) {
    return NextResponse.json(
      {
        error:
          'No active WarmHawk subscription is on file for this license. Renew from ' +
          'warmhawk.com/account/billing to restore dashboard access.',
        reason: 'no_active_subscription',
      },
      { status: 402 },
    );
  }

  const price = entitling.items.data[0]?.price;
  // Re-derived from the live subscription, never carried over from the old token: a customer who
  // switched monthly <-> annual gets an expiry matching what they now actually pay for.
  const interval = price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
  // Tier 2's recurring subscription item uses the SAME price as Tier 1's (both pay the identical
  // $199/mo software fee) — only Tier 2's one-time setup fee differs, and that's an invoice item,
  // never a subscription item, so it isn't in `entitling.items` at all, on the first cycle or any
  // later one. Price ID can't disambiguate the tiers, so tier is read from the subscription's own
  // metadata instead (stamped at checkout time by app/api/checkout/session/route.ts and preserved
  // across every metadata write since — see persistLicenseOnSubscription in
  // app/api/stripe/webhook/route.ts, which only ever merges in license fields).
  const tier = entitling.metadata?.tier === 'tier_2' ? 'tier_2' : 'tier_1';

  const now = Math.floor(Date.now() / 1000);
  const payload: LicensePayload = {
    licenseKey: generateLicenseKey(),
    customerId: existing.customerId,
    tier,
    issuedAt: now,
    expiresAt: computeExpiry(new Date(), interval),
    // Preserved so the Guardrails "License piracy signal" reuse check keeps working across a
    // refresh — a refreshed license stays bound to whatever domain it was activated against.
    ...(existing.boundDomain ? { boundDomain: existing.boundDomain } : {}),
  };

  const { token } = issueLicense(payload, privateKeyPem);

  return NextResponse.json({
    licenseToken: token,
    tier: payload.tier,
    expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
  });
}
