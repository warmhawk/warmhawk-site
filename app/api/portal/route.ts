import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { siteConfig } from '@/lib/siteConfig';
import { authenticateLicenseToken } from '@/lib/license';

/**
 * Stripe Customer Portal session creation — "self-serve card update, invoice history,
 * upgrade/downgrade (including annual <-> monthly on Tier 1), cancellation, all without a support
 * ticket" (Monetization & Tiering Strategy / Phase 4). Written against Stripe's documented
 * `billingPortal.sessions.create` shape (https://stripe.com/docs/api/customer_portal/sessions).
 *
 * Body: { licenseToken: string }
 *
 * SECURITY FIX (2026-08-30 go-live audit): this route previously accepted a raw
 * `stripeCustomerId` and opened a portal session for it with no authentication whatsoever. Stripe
 * customer ids are NOT secrets — they appear in receipts, invoice PDFs, support threads and
 * webhook payloads — so anyone who learned or guessed one could open that customer's billing
 * portal and read their invoice history, card last-4 and billing address, or cancel their
 * subscription. The old header comment acknowledged the caller was "expected to be a lightweight
 * account page that already knows the customer's Stripe id" and deferred that lookup as "out of
 * scope"; nothing enforced it.
 *
 * The license token is the right authenticator and needs no new infrastructure: only this
 * deployment's private key can mint one, it reaches nobody but the paying customer (by email at
 * purchase, and in their own server's .env thereafter), and its signed payload names the very
 * Stripe customer whose portal is being requested. `authenticateLicenseToken` deliberately accepts
 * an EXPIRED token — see its doc comment; a lapsed subscriber trying to pay again is the primary
 * user of this route, and their token is expired by definition.
 */
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
    // Same honest-degradation posture as lib/statusProvider.ts: say the environment isn't
    // configured rather than implying the customer's license is at fault.
    console.error('LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot verify a license token');
    return NextResponse.json(
      { error: 'Billing is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const payload = authenticateLicenseToken(licenseToken, privateKeyPem);
  if (!payload) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like a valid WarmHawk license. Paste the full token from your " +
          'purchase email (it is a long two-part string, not the short whk_live_ identifier).',
      },
      { status: 401 },
    );
  }

  try {
    const stripe = getStripeClient();
    // Same reasoning as app/api/checkout/session/route.ts's siteOrigin: a redirect target has to
    // return the browser to whichever environment sent it to the portal, not always production.
    const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: payload.customerId,
      return_url: `${siteOrigin}/account/billing`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe Customer Portal session creation failed', error);
    return NextResponse.json(
      { error: 'Unable to open billing portal right now.' },
      { status: 502 },
    );
  }
}
