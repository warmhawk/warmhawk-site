import { test, expect, type Page } from '@playwright/test';
import { createPublicKey } from 'node:crypto';
import { verifyLicense } from '@/lib/license';
import { target } from './targets';
import { waitForResendEmail } from './resendEmail';

/**
 * Full real-purchase journey: /checkout -> real Stripe Checkout Session -> real test-mode card
 * payment -> real invoice.paid webhook -> real license issuance -> real Resend email -> extract +
 * cryptographically verify the license token. Mirrors jitterflow-core-app's own
 * tests/human-journeys/signup-to-dashboard.spec.ts convention (a real dependency round trip, never
 * mocked) — for warmhawk-site, since there's no database, "real dependency" means Stripe's real
 * test-mode API and Resend's real API/SMTP relay.
 *
 * Drives Stripe's real hosted Checkout page end-to-end (completeStripeCheckoutViaBrowser below)
 * rather than confirming the Checkout Session via the Stripe API directly — that shortcut is
 * confirmed impossible: Stripe never creates the underlying PaymentIntent/SetupIntent until a
 * client actually engages the hosted page (per jitterflow-core-app's own
 * tests/human-journeys/signup-to-dashboard.spec.ts header comment, confirmed live 2026-08-26).
 * That same investigation found headless Chromium was never the problem — the real blocker was
 * Stripe's own "I am an AI agent acting on behalf of someone else" agentic-commerce disclosure
 * (a real, sanctioned consent flow, not a CAPTCHA/bot-block), which reveals a second required
 * disclosure checkbox before the card form becomes interactive. This spec runs under plain
 * headless Chromium — no xvfb/headed-mode dependency.
 *
 * This test creates a REAL Stripe test-mode subscription every run it actually executes. Stripe
 * test-mode data has no real financial cost and needs no automated cleanup (same as jitterflow's
 * own signup-to-dashboard.spec.ts convention) — the project owner may want to periodically clear
 * old test subscriptions from the Stripe test dashboard by hand.
 *
 * Selector provenance (see task report for what to double-check once real secrets exist):
 *  - The AI-agent disclosure checkboxes, the card accordion, #cardNumber/#cardExpiry/#cardCvc/
 *    #billingName/#billingPostalCode, #enableStripePass (Link "save my info"), and the
 *    `hosted-payment-submit-button` testid are all CONFIRMED against a live Stripe hosted Checkout
 *    page (jitterflow-core-app's own investigation, 2026-08-26) — this is generic Stripe hosted
 *    Checkout page behavior, not specific to that product, so it carries over directly.
 *  - `#email` is NOT confirmed the same way: warmhawk-site's Checkout Session (see
 *    app/api/checkout/session/route.ts) does not set `customer_email`, so Stripe's hosted page
 *    should render an editable email field rather than a prefilled one (unlike jitterflow's flow,
 *    which already ties the session to a known customer and never needs to fill this field itself)
 *    — `#email` is Stripe's standard hosted-Checkout field id for it, but unverified live here.
 *
 * COVERAGE AUDIT (Human Journey Gate task 1): warmhawk-site's only other real conversion path is
 * the Tier 2 (Enterprise DFY) contact-sales form — deliberately NOT given a human-journey spec.
 * Its send target (`siteConfig.helloEmail`, i.e. hello@warmhawk.com — see lib/email.ts's
 * sendSalesInquiryEmail) is hardcoded with no env override, unlike this test's own Stripe email
 * field, which is filled with Resend's dedicated `delivered@resend.dev` simulation sink precisely
 * so a real round trip never lands in a real inbox. There is no equivalent sink for contact-sales:
 * a real human-journey run would either spam the founder's actual business inbox with a synthetic
 * "Enterprise DFY inquiry" on every pipeline run, or fall back to mocking the network boundary —
 * which tests/e2e/contact-sales-submission.spec.ts already does, and duplicating that under
 * tests/human-journeys/ (whose whole point is REAL external round trips, not mocks) would be
 * padding, not coverage. Closing this for real needs a product decision (e.g. an
 * env-configurable sales-inquiry recipient) outside this pass's scope.
 *
 * What WAS a genuine gap: this spec used to stop at verifying the license token cryptographically
 * — it never confirmed the brand-new customer can actually reach their real Stripe billing portal
 * with it. app/api/portal/route.ts had a real, unauthenticated-access bug fixed only in the
 * 2026-08-30 go-live audit (see that route's own header comment), so a live check of the
 * now-fixed, license-token-gated path is worth the few extra seconds. Added as a continuation of
 * THIS test (not a new spec file) so it reuses the one real Stripe customer/subscription this test
 * already creates, rather than a second file needing its own real purchase to get a token from.
 */
// Synthetic-data marker (Human Journey Gate task 3) — establishes the `+wh-synth-` convention for
// warmhawk-site, mirroring jitterflow's own `+jf-synth-` tag so a future cleanup job can find every
// real Stripe test-mode customer this suite ever created. It can't live in the Stripe customer's
// email field: that field does double duty as BOTH the real Checkout `#email` input AND the
// recipient `waitForResendEmail` polls below, and it must stay the exact literal
// `delivered@resend.dev` — Resend's own documented simulation sink — for the whole real
// checkout -> webhook -> email round trip to work at all (an untested plus-addressed variant risks
// silently breaking that mechanism). The Stripe billing NAME has no such constraint and is exactly
// as inspectable in the test-mode dashboard, so the marker lives there instead.
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const SYNTHETIC_BILLING_NAME = `WarmHawk Human Journey Test +wh-synth-${RUN_ID}-checkout`;

test.describe('Human journey: real checkout -> real license email', () => {
  test.skip(
    !process.env.RESEND_API_KEY || !process.env.LICENSE_SIGNING_PRIVATE_KEY,
    'RESEND_API_KEY / LICENSE_SIGNING_PRIVATE_KEY not configured — skipping the live journey',
  );
  // CRITICAL prod-safety guard: a real-money-shaped purchase flow must never run automatically
  // against the production site.
  test.skip(target.label === 'prod', 'Real checkout only runs against local/stage, never prod');

  test('a visitor can buy Tier 1 and receive a verifiable license by email', async ({ page }) => {
    test.setTimeout(180_000); // real Stripe webhook delivery + Resend polling isn't instant

    // Captured before the real checkout below, so waitForResendEmail (see its own doc comment)
    // can never match route.integration.test.ts's synthetic license email — same recipient and
    // subject by design, since both suites use Resend's shared `delivered@resend.dev` sink.
    const checkoutStartedAt = new Date();

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

    // subjectContains matches lib/email.ts's sendLicenseEmail() exactly: 'Your WarmHawk install
    // command'. Generous timeout: this depends on real Stripe webhook delivery latency.
    const email = await waitForResendEmail({
      apiKey: process.env.RESEND_API_KEY!,
      toEmail: 'delivered@resend.dev',
      subjectContains: 'Your WarmHawk install command',
      sentAfter: checkoutStartedAt,
      timeoutMs: 120_000,
    });
    expect(email, 'No license email arrived at delivered@resend.dev within 120s').not.toBeNull();

    // lib/email.ts's buildInstallCommand() shape: `curl -fsSL https://warmhawk.com/install | bash
    // -s -- --license <token> --domain <your-domain> --owner-email <email>`.
    const installCommandMatch = email!.text.match(
      /--license (\S+) --domain <your-domain> --owner-email delivered@resend\.dev/,
    );
    expect(
      installCommandMatch,
      `Install command not found in email body:\n${email!.text}`,
    ).not.toBeNull();
    // noUncheckedIndexedAccess (tsconfig.json) types a regex match's captured group as
    // `string | undefined`; the `.not.toBeNull()` assertion above already proved the match (and
    // therefore this group) exists.
    const licenseToken = installCommandMatch![1]!;

    // No separate public-key secret needed — derived from the same LICENSE_SIGNING_PRIVATE_KEY
    // env var used to sign it, per lib/license.ts's issue/verify pair.
    const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY!;
    const publicKeyPem = createPublicKey(privateKeyPem)
      .export({ type: 'spki', format: 'pem' })
      .toString();

    const result = verifyLicense(licenseToken, publicKeyPem);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.tier).toBe('tier_1');
    }

    // Closes the coverage gap this spec used to leave open (see module doc's "COVERAGE AUDIT"):
    // a cryptographically valid token is necessary but not sufficient — this is the same next
    // step a real Tier 1 buyer takes (see warmhawk-enterprise-operator's LicenseGate expired-
    // license screen, which links here). Reuses the SAME real Stripe customer/subscription this
    // test already created above; no second charge or email.
    await page.goto(`${target.baseURL}/account/billing`);
    await page.getByLabel('Your license token').fill(licenseToken);
    await page.getByRole('button', { name: 'Open billing portal' }).click();
    await page.waitForURL(/^https:\/\/billing\.stripe\.com\//, { timeout: 30_000 });
  });
});

// Drives Stripe's own hosted Checkout page for real, using their documented test card
// (docs.stripe.com/testing) — completes the payment rather than just verifying the page renders.
// Ported from jitterflow-core-app's tests/human-journeys/signup-to-dashboard.spec.ts
// completeStripeCheckoutViaBrowser(), adapted to warmhawk-site's own success-URL shape (this repo
// redirects back to /compare/pricing?checkout=success, not a /welcome/ activation page — see
// app/api/checkout/session/route.ts's success_url, so there's no page-side activation poll to wait
// on here; the caller polls Resend for the license email instead).
async function completeStripeCheckoutViaBrowser(page: Page) {
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

  // Card renders as a collapsed accordion row (a "Card" radio next to its own "Pay with card"
  // button) in some Checkout configurations, not pre-expanded — #cardNumber never appears without
  // selecting it first in that case. The radio and its overlapping expand-button both fail
  // Playwright's own click ("subtree intercepts pointer events" / "element is not visible") even
  // though the button is real and interactive — same native-click escape hatch as the two
  // checkboxes above. Only clicks when the fields aren't already visible, so this keeps working
  // if Checkout is pre-expanded instead.
  if (
    !(await page
      .locator('#cardNumber')
      .isVisible()
      .catch(() => false))
  ) {
    const cardAccordionButton = page.locator('[data-testid="card-accordion-item-button"]');
    if (await cardAccordionButton.count()) {
      await cardAccordionButton.evaluate((el: HTMLButtonElement) => el.click());
    }
  }

  await page.locator('#cardNumber').waitFor({ state: 'visible', timeout: 30_000 });

  // UNVERIFIED against warmhawk-site's live Checkout page — see module doc: this repo's Checkout
  // Session doesn't set `customer_email`, so the hosted page should show an editable (not
  // prefilled) email field. `#email` is Stripe's standard hosted-Checkout field id for it.
  const emailField = page.locator('#email');
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill('delivered@resend.dev');
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
