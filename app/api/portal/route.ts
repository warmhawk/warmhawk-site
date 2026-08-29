import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Stripe Customer Portal session creation — "self-serve card update,
 * invoice history, upgrade/downgrade (including annual <-> monthly on
 * Tier 1), cancellation, all without a support ticket" (Monetization &
 * Tiering Strategy / Phase 4). Written against Stripe's documented
 * `billingPortal.sessions.create` shape
 * (https://stripe.com/docs/api/customer_portal/sessions); never called
 * live from this build.
 *
 * Body: { stripeCustomerId: string }
 *
 * In the real deployment, `stripeCustomerId` comes from wherever the
 * customer's session/account record stores it (this repo has no auth
 * system of its own — warmhawk-site is unauthenticated marketing content
 * per the Repo Architecture — so the caller is expected to be a
 * lightweight account page that already knows the customer's Stripe id,
 * e.g. looked up by the license key or an emailed magic link; that lookup
 * mechanism is out of scope for this skeleton).
 */
export async function POST(request: NextRequest) {
  let stripeCustomerId: string | undefined;
  try {
    const body = (await request.json()) as { stripeCustomerId?: string };
    stripeCustomerId = body.stripeCustomerId;
  } catch {
    // fall through to the validation below
  }

  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'stripeCustomerId is required' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    // Same reasoning as app/api/checkout/session/route.ts's siteOrigin: a redirect target has to
    // return the browser to whichever environment sent it to the portal, not always production.
    const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteOrigin}/compare/pricing`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe Customer Portal session creation failed', error);
    return NextResponse.json({ error: 'Unable to open billing portal right now.' }, { status: 502 });
  }
}
