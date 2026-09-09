import { test, expect, type Page } from '@playwright/test';
import Stripe from 'stripe';
import { target } from './targets';
import { verifyLicense, derivePublicKeyPem } from '../../lib/license';

/**
 * Real-purchase journey: /checkout -> real Stripe Checkout Session -> real test-mode card payment
 * -> success redirect. Follows the established human-journey testing convention of a real
 * dependency round trip, never mocked — for warmhawk-site, since there's no database, "real
 * dependency" means Stripe's real test-mode API.
 *
 * Drives Stripe's real hosted Checkout page end-to-end (completeStripeCheckoutViaBrowser below)
 * rather than confirming the Checkout Session via the Stripe API directly — that shortcut is
 * confirmed impossible: Stripe never creates the underlying PaymentIntent/SetupIntent until a
 * client actually engages the hosted page (confirmed live 2026-08-26).
 * That same investigation found headless Chromium was never the problem — the real blocker was
 * Stripe's own "I am an AI agent acting on behalf of someone else" agentic-commerce disclosure
 * (a real, sanctioned consent flow, not a CAPTCHA/bot-block), which reveals a second required
 * disclosure checkbox before the card form becomes interactive. This spec runs under plain
 * headless Chromium — no xvfb/headed-mode dependency.
 *
 * This test creates a REAL Stripe test-mode subscription every run it actually executes. Stripe
 * test-mode data has no real financial cost and needs no automated cleanup — the project owner may
 * want to periodically clear old test subscriptions from the Stripe test dashboard by hand.
 *
 * Selector provenance (see task report for what to double-check once real secrets exist):
 *  - The AI-agent disclosure checkboxes, the card accordion, #cardNumber/#cardExpiry/#cardCvc/
 *    #billingName/#billingPostalCode, #enableStripePass (Link "save my info"), and the
 *    `hosted-payment-submit-button` testid are all CONFIRMED against a live Stripe hosted Checkout
 *    page (confirmed 2026-08-26) — this is generic Stripe hosted Checkout page behavior, not
 *    specific to any one product, so it carries over directly.
 *  - `#email` is NOT confirmed the same way: warmhawk-site's Checkout Session (see
 *    app/api/checkout/session/route.ts) does not set `customer_email`, so Stripe's hosted page
 *    should render an editable email field rather than a prefilled one (unlike a flow that already
 *    ties the session to a known customer and never needs to fill this field itself) — `#email` is
 *    Stripe's standard hosted-Checkout field id for it, but unverified live here.
 *
 * COVERAGE AUDIT (Human Journey Gate task 1): warmhawk-site's only other real conversion path is
 * the Tier 2 (Enterprise DFY) contact-sales form — deliberately NOT given a human-journey spec.
 * Its send target (`siteConfig.helloEmail`, i.e. hello@warmhawk.com — see lib/email.ts's
 * sendSalesInquiryEmail) is hardcoded with no env override, unlike this test's own Stripe email
 * field. A real human-journey run would either spam the founder's actual business inbox with a
 * synthetic "Enterprise DFY inquiry" on every pipeline run, or fall back to mocking the network
 * boundary — which tests/e2e/contact-sales-submission.spec.ts already does, and duplicating that
 * under tests/human-journeys/ (whose whole point is REAL external round trips, not mocks) would be
 * padding, not coverage. Closing this for real needs a product decision (e.g. an
 * env-configurable sales-inquiry recipient) outside this pass's scope.
 *
 * 🔴 KNOWN GAP (email-provider migration, 2026-09-06): this spec used to continue past the real
 * checkout by polling the email provider's own REST API for the delivered license email, extracting
 * the license token from its body, cryptographically verifying it, and then using that token to
 * open the real Stripe billing portal. The current email provider's own sent-log API is
 * metadata-only — it never returns a delivered message's body — so that whole tail is no longer
 * possible without this app growing its own send-side capture endpoint (an app process logs what
 * it itself just sent, rather than asking the provider to hand the body back). Until that exists,
 * this spec verifies only that a real purchase completes; it does not verify the license email or
 * the billing-portal step. See app/api/stripe/webhook/route.integration.test.ts's module doc for
 * the same gap on the webhook-integration side.
 */
// Synthetic-data marker (Human Journey Gate task 3) — establishes the `+wh-synth-` convention for
// warmhawk-site, following the same plus-addressed synthetic-data tag pattern used elsewhere so a
// future cleanup job can find every real Stripe test-mode customer this suite ever created.
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const SYNTHETIC_BILLING_NAME = `WarmHawk Human Journey Test +wh-synth-${RUN_ID}-checkout`;

test.describe('Human journey: real checkout', () => {
  // CRITICAL prod-safety guard: a real-money-shaped purchase flow must never run automatically
  // against the production site.
  test.skip(target.label === 'prod', 'Real checkout only runs against local/stage, never prod');

  // Journey A step 6 (added 2026-09-08): extended past "checkout completes" to close the
  // /account/billing lookup+refresh gap. Reuses the exact subscription-metadata-polling technique
  // Journey M step 1 added to the Tier 2 test below, which sidesteps the KNOWN GAP documented at
  // the top of this file (the email provider's sent-log API can't hand back a delivered message's
  // body, so the license token can no longer be recovered from the actual license email) — the
  // token was never only reachable via email; it's on the subscription's own metadata the whole
  // time. Confirms `/account/billing`'s `BillingPortalForm` really opens a real Stripe Customer
  // Portal session for a token that was never touched by hand.
  test('a visitor can buy Tier 1 via a real Stripe checkout, then look up and refresh billing with the issued license', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await page.goto(`${target.baseURL}/checkout`);

    // Same locators as tests/e2e/human-journey.spec.ts's checkout section, for consistency.
    const tier1Tab = page.getByRole('tab', { name: 'Tier 1 — Self-Hosted Pro' });
    await expect(tier1Tab).toHaveAttribute('aria-selected', 'true');

    // See components/CheckoutButtons.tsx: this POSTs to /api/checkout/session and redirects the
    // browser to the returned Stripe Checkout URL via `window.location.href`.
    await page.getByRole('button', { name: 'Start your install — Self-Hosted Pro' }).click();
    await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 });

    await completeStripeCheckoutViaBrowser(page);

    // Matches app/api/checkout/session/route.ts's success_url.
    expect(page.url()).toContain('checkout=success');

    const sessionId = new URL(page.url()).searchParams.get('session_id');
    expect(sessionId, 'success redirect must carry session_id').toBeTruthy();

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    expect(stripeSecretKey, 'STRIPE_SECRET_KEY must be set for this target').toBeTruthy();
    const stripe = new Stripe(stripeSecretKey!);

    const session = await stripe.checkout.sessions.retrieve(sessionId!);
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    expect(
      subscriptionId,
      'a subscription must be attached to a mode:subscription session',
    ).toBeTruthy();

    // Same async-webhook-lag reasoning as the Tier 2 test below.
    let tokenChunk1: string | undefined;
    let tokenChunk2: string | undefined;
    let tierMetadata: string | undefined;
    for (let attempt = 0; attempt < 15; attempt++) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId!);
      tokenChunk1 = subscription.metadata.warmhawk_license_token_1;
      tokenChunk2 = subscription.metadata.warmhawk_license_token_2;
      tierMetadata = subscription.metadata.tier;
      if (tokenChunk1 && tokenChunk2) break;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    expect(
      tokenChunk1,
      'invoice.paid must have persisted a license token onto the subscription',
    ).toBeTruthy();
    expect(tierMetadata).toBe('tier_1');
    const licenseToken = `${tokenChunk1}${tokenChunk2}`;

    // --- /account/billing: paste the real, freshly-issued token and open a real portal session ---
    await page.goto(`${target.baseURL}/account/billing`);
    await page.getByLabel('Your license token').fill(licenseToken);
    await Promise.all([
      page.waitForURL(/^https:\/\/billing\.stripe\.com\//, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Open billing portal' }).click(),
    ]);
    expect(page.url()).toContain('billing.stripe.com');
  });

  // P11a (found 2026-09-08 auditing recent commits — see Journey M): Tier 2 (Enterprise DFY)
  // became a fully self-serve Stripe Checkout purchase on 2026-09-03/04 ($199/mo, same recurring
  // price as Tier 1, plus a one-time $1,999 setup fee on the first invoice), replacing the old
  // contact-sales-only flow — this repo's own `Tier2CheckoutButton.tsx` doc comment confirms an
  // earlier draft of that button wrongly said "no recurring charge" and was caught before shipping,
  // which is exactly the kind of pricing-copy regression a real checkout round trip like this one
  // would catch automatically. Zero new prerequisites beyond the Tier 1 case above: same
  // `completeStripeCheckoutViaBrowser()` helper, `?tier=2` starts the page on the Tier 2 tab
  // (app/checkout/page.tsx), and `STRIPE_PRICE_TIER_2` is confirmed populated in this target env's
  // real (test-mode) Stripe config — checked directly in `.env/.env.local`, not assumed.
  //
  // Journey M step 1 (added 2026-09-08): extended past "checkout completes" to confirm, against
  // the real Stripe test-mode API, both line items actually appear on the session ($199/mo
  // recurring + $1,999 one-time setup fee) and that the async `invoice.paid` webhook really does
  // issue a license carrying `tier: 'tier_2'` in its signed payload — the exact round trip flagged
  // as "not yet fully live-tested" in [[warmhawk-prod-license-key-malformed-pem-outage]] after that
  // outage's fix. Reads the token back off the subscription's `warmhawk_license_token_1/2`
  // metadata chunks (see app/api/stripe/webhook/route.ts's `persistLicenseOnSubscription`) and
  // cryptographically verifies it with this target's own `LICENSE_SIGNING_PRIVATE_KEY` (stage has
  // its own dedicated keypair, deliberately different from prod's — see that key's own env comment)
  // rather than trusting the metadata fields alone.
  test('a visitor can buy Tier 2 (Enterprise DFY) via a real Stripe checkout, with both line items and a real tier_2 license issued', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await page.goto(`${target.baseURL}/checkout?tier=2`);

    const tier2Tab = page.getByRole('tab', { name: 'Tier 2 — Enterprise DFY' });
    await expect(tier2Tab).toHaveAttribute('aria-selected', 'true');

    // See components/Tier2CheckoutButton.tsx: POSTs { tier: 'tier_2' } to /api/checkout/session
    // and redirects the browser to the returned Stripe Checkout URL, same as Tier 1's button.
    await page.getByRole('button', { name: 'Get started — $1,999 + $199/mo' }).click();
    await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 });

    await completeStripeCheckoutViaBrowser(page);

    // Matches app/api/checkout/session/route.ts's Tier 2 success_url
    // (`/checkout?tier=2&checkout=success&session_id=...`).
    expect(page.url()).toContain('checkout=success');

    const sessionId = new URL(page.url()).searchParams.get('session_id');
    expect(sessionId, 'success redirect must carry session_id').toBeTruthy();

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    expect(stripeSecretKey, 'STRIPE_SECRET_KEY must be set for this target').toBeTruthy();
    const stripe = new Stripe(stripeSecretKey!);

    // --- Confirm both line items appear on the real session ---
    const session = await stripe.checkout.sessions.retrieve(sessionId!, {
      expand: ['line_items'],
    });
    const lineItems = session.line_items?.data ?? [];
    expect(lineItems, 'Tier 2 session must have exactly 2 line items').toHaveLength(2);

    const oneTimeItem = lineItems.find((li) => li.amount_total === 199_900 && !li.price?.recurring);
    const recurringItem = lineItems.find((li) => li.amount_total === 19_900 && li.price?.recurring);
    expect(oneTimeItem, 'a $1,999 one-time setup-fee line item must be present').toBeTruthy();
    expect(
      recurringItem,
      'a $199/mo recurring software-fee line item must be present',
    ).toBeTruthy();

    // --- Confirm the invoice.paid webhook really issued a tier_2 license ---
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    expect(
      subscriptionId,
      'a subscription must be attached to a mode:subscription session',
    ).toBeTruthy();

    // The webhook fires asynchronously after checkout completes — poll rather than assume it has
    // already landed by the time this browser-driven flow returns control.
    let tokenChunk1: string | undefined;
    let tokenChunk2: string | undefined;
    let tierMetadata: string | undefined;
    for (let attempt = 0; attempt < 15; attempt++) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId!);
      tokenChunk1 = subscription.metadata.warmhawk_license_token_1;
      tokenChunk2 = subscription.metadata.warmhawk_license_token_2;
      tierMetadata = subscription.metadata.tier;
      if (tokenChunk1 && tokenChunk2) break;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    expect(
      tokenChunk1,
      'invoice.paid must have persisted a license token onto the subscription',
    ).toBeTruthy();
    expect(tierMetadata).toBe('tier_2');

    const licenseToken = `${tokenChunk1}${tokenChunk2}`;
    const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
    expect(privateKeyPem, 'LICENSE_SIGNING_PRIVATE_KEY must be set for this target').toBeTruthy();
    const publicKeyPem = derivePublicKeyPem(privateKeyPem!);
    const verification = verifyLicense(licenseToken, publicKeyPem);
    expect(
      verification.valid,
      `license signature must verify: ${JSON.stringify(verification)}`,
    ).toBe(true);
    expect(verification.payload?.tier).toBe('tier_2');
  });
});

// Drives Stripe's own hosted Checkout page for real, using their documented test card
// (docs.stripe.com/testing) — completes the payment rather than just verifying the page renders.
// Adapted to warmhawk-site's own success-URL shape (this repo redirects back to
// /compare/pricing?checkout=success, not a /welcome/ activation page — see
// app/api/checkout/session/route.ts's success_url).
async function completeStripeCheckoutViaBrowser(page: Page) {
  // Stripe paints the hosted page's payment form asynchronously, well after the navigation that
  // got us here resolves. Every step below probes with `count()`, which returns 0 for a form that
  // simply hasn't rendered yet exactly as it does for a selector that no longer exists — so
  // without this anchor the disclosure checkbox and the card accordion are both silently skipped
  // on a normal-speed load, and the only symptom is a `#cardNumber` timeout 30s later that names
  // neither step. Waiting on the payment-method section (which renders regardless of the
  // disclosure below) is what makes those later counts mean what they claim to mean.
  await page
    .locator(
      '#cardNumber, #payment-method-accordion-item-title-card, [data-testid="card-accordion-item-button"]',
    )
    .first()
    .waitFor({ state: 'attached', timeout: 60_000 });

  // Stripe's real, sanctioned disclosure for exactly this case: a plain consent checkbox ("I am
  // an AI agent acting on behalf of someone else"), not a CAPTCHA/block. Checking it honestly
  // (this genuinely is Playwright automation) is what actually lets the flow proceed. Real,
  // native in-page clicks (element.click()), not Playwright's normal mouse-position-based click —
  // Stripe renders both checkboxes below in a spot Playwright's viewport-relative click can't
  // reach ("Element is outside of the viewport" persists even with force:true). Dispatched by the
  // browser engine itself, so it still fires the real click/change events Stripe's own listener
  // needs.
  const aiAgentCheckbox = page.getByRole('checkbox', {
    name: /I am an AI agent acting on behalf of someone else/i,
  });
  if (await aiAgentCheckbox.count()) {
    await aiAgentCheckbox.evaluate((el: HTMLInputElement) => el.click());

    // Checking the box above reveals Stripe's real "Link CLI" agentic-commerce panel — a second,
    // required disclosure checkbox plus instructions for an AI agent to get one-time payment
    // details via a separate CLI tool instead of filling the card form directly. This suite
    // doesn't use Link CLI (it fills the card form itself, same as any other payment method), so
    // per the panel's own instructions this just acknowledges the panel and proceeds with the
    // normal card fields below — the payment form only becomes interactive once this second box
    // is checked too.
    const followedInstructionsCheckbox = page.getByRole('checkbox', {
      name: /I am an AI agent and have followed the instructions above/i,
    });
    await followedInstructionsCheckbox.waitFor({ state: 'attached', timeout: 10_000 });
    await followedInstructionsCheckbox.evaluate((el: HTMLInputElement) => el.click());
  }

  // Card renders as a collapsed accordion row (a "Card" radio beside Cash App Pay / Klarna / Bank)
  // whenever more than one payment method is enabled, not pre-expanded — #cardNumber never appears
  // without selecting it first in that case. The radio and its overlapping expand-button both fail
  // Playwright's own click ("subtree intercepts pointer events" / "element is not visible") even
  // though they are real and interactive — same native-click escape hatch as the two checkboxes
  // above. Only clicks when the fields aren't already visible, so this keeps working if Checkout
  // is pre-expanded instead.
  if (
    !(await page
      .locator('#cardNumber')
      .isVisible()
      .catch(() => false))
  ) {
    // Ordered most- to least-stable. `data-testid` used to be the hook here and was the ONLY one
    // tried; Stripe has since dropped every data-testid from the accordion, so that selector now
    // matches nothing. The radio's id is the durable replacement: it is semantic
    // (`...-title-<method>`), it is what the accessibility tree exposes as the "Card" radio, and
    // unlike the class names it is not a styling artifact.
    const cardAccordionSelectors = [
      '#payment-method-accordion-item-title-card',
      '[data-testid="card-accordion-item-button"]',
      '.card-accordion-item-cover',
    ];

    let expanded = false;
    for (const selector of cardAccordionSelectors) {
      const candidate = page.locator(selector).first();
      if (!(await candidate.count())) continue;
      await candidate.evaluate((el: HTMLElement) => el.click());
      expanded = await page
        .locator('#cardNumber')
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (expanded) break;
    }

    // Fail on the actual cause. The previous `if (await count())` guard swallowed a selector that
    // had rotted away to zero matches and let the run die 30s later on a `#cardNumber` timeout,
    // which describes the symptom and names none of the three selectors that missed.
    if (!expanded) {
      throw new Error(
        `Could not expand the Card payment method on Stripe Checkout. None of these revealed ` +
          `#cardNumber: ${cardAccordionSelectors.join(', ')}. Stripe most likely renamed the ` +
          `accordion hooks again — re-inspect the hosted page and add the current selector.`,
      );
    }
  }

  await page.locator('#cardNumber').waitFor({ state: 'visible', timeout: 30_000 });

  // UNVERIFIED against warmhawk-site's live Checkout page — see module doc: this repo's Checkout
  // Session doesn't set `customer_email`, so the hosted page should show an editable (not
  // prefilled) email field. `#email` is Stripe's standard hosted-Checkout field id for it. Filled
  // with a synthetic, obviously-test address — no provider sandbox recipient is needed now that
  // this spec no longer polls for a delivered email (see module doc's KNOWN GAP).
  const emailField = page.locator('#email');
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(`wh-synth-${RUN_ID}@example.com`);
  }

  await page.locator('#cardNumber').fill('4242424242424242');
  await page.locator('#cardExpiry').fill('12/34');
  await page.locator('#cardCvc').fill('123');
  await page.locator('#billingName').fill(SYNTHETIC_BILLING_NAME);
  const postalCode = page.locator('#billingPostalCode');
  if (await postalCode.count()) {
    await postalCode.fill('94103');
  }

  // "Save my information for faster checkout" (Link) starts checked in some configurations, which
  // makes a phone-number field required; leaving that unfilled silently blocks the submit button,
  // so this unchecks Link instead of fabricating a real-looking phone number.
  const linkCheckbox = page.locator('#enableStripePass');
  if (await linkCheckbox.isChecked().catch(() => false)) {
    await linkCheckbox.click();
  }

  await Promise.all([
    page.waitForURL(/checkout=success/, { timeout: 60_000 }),
    page.getByTestId('hosted-payment-submit-button').click(),
  ]);
}
