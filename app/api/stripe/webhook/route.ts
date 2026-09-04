import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import {
  generateLicenseKey,
  issueLicense,
  computeExpiry,
  type LicensePayload,
} from '@/lib/license';
import { emailSender } from '@/lib/email';

/**
 * Stripe webhook receiver — the one piece of billing infrastructure WarmHawk itself operates
 * centrally (see spec's Support Model: "the marketing site and the Stripe webhook ->
 * license-issuance path"). Written against Stripe's documented webhook-verification shape
 * (https://stripe.com/docs/webhooks#verify-events); never invoked against a real Stripe account or
 * a live signing secret from this build.
 *
 * V12 fix: this route previously issued a payload shape (`licenseId`/`stripeCustomerId`/
 * `stripeSubscriptionId`/a hardcoded `tier: 'self-hosted-pro'` literal) that matched neither
 * warmhawk-core-engine's nor warmhawk-enterprise-operator's license code, and signed over the
 * base64-encoded payload string instead of the raw JSON — a different scheme entirely. It now uses
 * the one canonical `LicensePayload` shape/signing scheme (see `lib/license.ts`).
 *
 * V13 fix: issues a license on `invoice.paid` ONLY, not `checkout.session.completed` too. Both
 * events fire for a `mode: 'subscription'` Checkout's first billing cycle, so acting on both
 * double-issued a license (and a duplicate email) for every real purchase. `invoice.paid` alone
 * already covers the first invoice AND every renewal — Stripe's own documented pattern for
 * provisioning subscription access — so nothing is lost by dropping the other. This also fixes a
 * second, previously-inert bug: a Checkout Session's own `metadata` does NOT propagate to the
 * invoices Stripe generates for that subscription (confirmed against Stripe's own object model), so
 * reading `object.metadata` directly off a `checkout.session.completed` event would silently
 * resolve to defaults on every `invoice.paid` event that actually matters. Fixed by having
 * `app/api/checkout/session/route.ts` set metadata under `subscription_data` instead, which Stripe
 * DOES copy onto every invoice the subscription generates.
 *
 * 2026-09-03/04: Tier 2 (Enterprise DFY) went through two designs. The first — a pure one-time
 * $1,999 charge via `mode: 'payment'`, issuing a non-expiring "lifetime" license off
 * `checkout.session.completed` — was wrong and never merged: Tier 2 actually charges that $1,999
 * setup fee ONCE plus the same $199/mo software fee Tier 1 pays, forever after. It is `mode:
 * 'subscription'` like Tier 1, with the setup fee as a second one-time line item (see
 * app/api/checkout/session/route.ts), so it generates invoices and issues through `invoice.paid`
 * exactly like Tier 1 — no separate `checkout.session.completed` handling needed or present. The
 * one wrinkle: Tier 2's recurring price is IDENTICAL to Tier 1's, so an invoice's price ID can no
 * longer tell the tiers apart (this used to be `tierForPriceId`, now removed) — tier is read from
 * `invoice.metadata.tier` instead, propagated from `subscription_data.metadata` at checkout time
 * exactly like `billingInterval` already was.
 *
 * Handles exactly the events Phase 4 specifies:
 *  - invoice.paid -> issue a signed license, email the install command to the customer. Both Tier 1
 *    and Tier 2 — both are real recurring subscriptions, so both always generate invoices.
 *  - invoice.payment_failed / customer.subscription.deleted -> no active revocation; the
 *    previously-issued license simply expires at its embedded date, and LicenseGate's periodic
 *    re-validation on the dashboard side naturally locks out after that.
 *
 * IMPORTANT (V12 process lesson, Testing Strategy): a multi-condition go/no-go check must require
 * every condition, not just the first one checked. Issuing a license here depends on BOTH a
 * verified Stripe signature AND a resolvable customer id on the event object — this handler checks
 * both before calling issueLicense(), never just the signature check alone.
 */
/** Stripe caps a metadata VALUE at 500 characters. A signed license runs longer than that (a
 *  base64url payload plus a base64url RSA-2048 signature), so it is stored in two halves and
 *  rejoined by whoever reads it back. Chunked at 450 to stay clear of the limit. */
const METADATA_CHUNK_SIZE = 450;

/**
 * Writes the issued license onto the Stripe SUBSCRIPTION the invoice belongs to, so the token has
 * a durable home outside the customer's inbox. The subscription (not the invoice) is the right
 * anchor: it is the object that persists across billing cycles, so each renewal overwrites these
 * keys with the current license rather than scattering one per invoice.
 */
async function persistLicenseOnSubscription(
  invoice: Stripe.Invoice,
  token: string,
  payload: LicensePayload,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) {
    // A one-off invoice with no subscription (e.g. a hand-raised invoice from the Stripe
    // dashboard) has nowhere durable to hang this. Log the token itself so it is at least
    // recoverable from logs.
    console.warn('Issued license for an invoice with no subscription — storing in logs only', {
      licenseKey: payload.licenseKey,
      licenseToken: token,
    });
    return;
  }

  // Two 450-char chunks hold 900 characters; a current token runs ~620 (a ~270-char base64url
  // payload plus a 344-char base64url RSA-2048 signature). Guard anyway, so a future key-size or
  // payload change surfaces as a loud log line rather than a silently truncated, unusable token.
  if (token.length > METADATA_CHUNK_SIZE * 2) {
    console.error('License token exceeds the two-chunk metadata budget — not persisting it', {
      licenseKey: payload.licenseKey,
      tokenLength: token.length,
    });
    return;
  }

  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      // Existing keys (tier, billingInterval) are preserved: Stripe merges metadata updates,
      // only overwriting the keys named here.
      warmhawk_license_key: payload.licenseKey,
      warmhawk_license_expires_at: new Date(payload.expiresAt * 1000).toISOString(),
      warmhawk_license_token_1: token.slice(0, METADATA_CHUNK_SIZE),
      warmhawk_license_token_2: token.slice(METADATA_CHUNK_SIZE, METADATA_CHUNK_SIZE * 2),
    },
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook not configured (missing signature header or STRIPE_WEBHOOK_SECRET).' },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        // Both conditions required, not just the first checked (V12 lesson).
        if (!customerId) {
          console.error(`${event.type} missing a resolvable customer id`, { eventId: event.id });
          break;
        }

        // Tier 2's recurring price is IDENTICAL to Tier 1's (same $199/mo software fee) — only its
        // one-time setup-fee line item differs, and that line item is absent from every renewal
        // invoice after the first. Price ID cannot disambiguate the tiers, so tier is read from
        // `subscription_data.metadata` (propagated onto every invoice by Stripe), exactly like
        // `billingInterval` below.
        const tier = invoice.metadata?.tier === 'tier_2' ? 'tier_2' : 'tier_1';
        const interval = invoice.metadata?.billingInterval === 'annual' ? 'annual' : 'monthly';

        const now = Math.floor(Date.now() / 1000);
        const payload: LicensePayload = {
          licenseKey: generateLicenseKey(),
          customerId,
          tier,
          issuedAt: now,
          expiresAt: computeExpiry(new Date(), interval),
        };

        const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
        if (!privateKeyPem) {
          console.error('LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot issue a license', {
            eventId: event.id,
          });
          break;
        }

        const { token } = issueLicense(payload, privateKeyPem);

        // Persist the token before attempting delivery (2026-08-30 audit finding L2). This repo
        // has no database, and until now the signed token existed only in the outbound email —
        // if that bounced or landed in spam it was unrecoverable, because re-signing by hand was
        // the only way back. (The comment that used to sit below claimed the license was
        // "retrievable from Stripe's own record of the event"; it wasn't. Stripe records the
        // invoice, not our RSA-signed token. Writing it here is what finally makes that true.)
        await persistLicenseOnSubscription(invoice, token, payload).catch((error) => {
          // Degrade, never crash: a metadata write failure must not fail the webhook and trigger
          // a Stripe retry that would issue a second license for the same invoice.
          console.error('Could not persist license to Stripe subscription metadata', {
            eventId: event.id,
            error,
          });
        });

        // Invoice objects carry `customer_email` directly (not `customer_details`, which only
        // exists on Checkout.Session) — this was silently always-undefined before the V13 fix.
        const toEmail = invoice.customer_email ?? undefined;
        if (toEmail) {
          await emailSender.sendLicenseEmail({ toEmail, licenseToken: token, tier });
        } else {
          console.error('Issued license but no customer email was resolvable on the event', {
            eventId: event.id,
            licenseKey: payload.licenseKey,
          });
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'customer.subscription.deleted': {
        // Deliberately no action: the previously-issued license expires on its own embedded date.
        // See LicensePayload.expiresAt and docs/stripe-webhooks for the reasoning.
        console.log(`${event.type} received — no active revocation by design (Phase 4).`);
        break;
      }

      default:
        // Unhandled event types are expected and fine — Stripe sends many event types this
        // integration doesn't act on.
        break;
    }
  } catch (error) {
    console.error('Error processing Stripe webhook event', event.type, error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
