import { test, expect } from '@playwright/test';
import { target } from './targets';

/**
 * Real "watch this domain" journey: /tools/domain-check -> real gate form submit -> real
 * warmhawk-probe /watch call -> the "check your inbox" confirmation state. Follows the established
 * human-journey convention of a real dependency round trip, never mocked (see
 * checkout-and-license.spec.ts) — here "real dependency" means the site's own proxy routes and a
 * live warmhawk-probe deployment.
 *
 * 🔴 SKIPPED (2026-09-06): the very first "Check 1 domain" button on this page is gated behind a
 * real Cloudflare Turnstile challenge on stage (components/DomainCheckTool.tsx's own useTurnstile()
 * instance), and WatchForm behind it carries a second, separate Turnstile gate of its own. Confirmed
 * live against stage (pipeline warmhawk/warmhawk-probe#21's own site counterpart, pipeline 257):
 * the button stays disabled for the full 60s timeout because Turnstile never calls back to a
 * headless CI browser — this is the widget correctly refusing to pass automated traffic, not a bug.
 * Driving the API routes directly instead of the UI would only trade one problem for another:
 * warmhawk-probe's stage TURNSTILE_SECRET is a real, non-empty key (same key as prod), so an
 * unauthenticated direct POST gets a genuine 403 there too — and blanking it to make this pass
 * would disable real bot protection on a box that otherwise mirrors prod. Skipping until either
 * warmhawk-site ships a second, non-production build variant (see Dockerfile.web's build-arg,
 * which today bakes the same real Turnstile site key into every build stage AND prod share) or
 * Cloudflare Turnstile publishes a way to allow-list this CI runner's egress IP.
 *
 * 🔴 KNOWN GAP (email-provider migration, 2026-09-06): even if the above were solved, this spec
 * used to continue past the submit by polling the email provider's own REST API for the delivered
 * confirm email, extracting the confirm/unsubscribe links from its body, and driving both. The
 * current email provider's own sent-log API is metadata-only — it never returns a delivered
 * message's body — so that whole tail is no longer possible without warmhawk-probe growing its own
 * send-side capture endpoint (the process logs what it itself just sent, rather than asking the
 * provider to hand the body back). See app/api/stripe/webhook/route.integration.test.ts's module
 * doc for the same gap on the checkout/license side.
 */
test.describe.skip('Human journey: real domain watch submit', () => {
  test('a visitor can submit the watch form and reach the confirmation state', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto(`${target.baseURL}/tools/domain-check`);

    await page.locator('#domain-check-input').fill('example.com');
    await page.getByRole('button', { name: 'Check 1 domain' }).click();

    // WatchForm only renders once real results land — see components/DomainCheckTool.tsx.
    await expect(page.getByRole('heading', { name: 'Watch this domain' })).toBeVisible({
      timeout: 30_000,
    });

    // A synthetic, obviously-test address — no provider sandbox recipient is needed now that this
    // spec no longer polls for a delivered email (see module doc's KNOWN GAP).
    const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await page.getByLabel('Email').fill(`wh-synth-${runId}@example.com`);
    await page.getByRole('button', { name: 'Email me on changes' }).click();

    // Identical wording regardless of what the probe did internally (new signup, resend, no-op) —
    // see WatchForm.tsx's own comment on why the UI never branches on that.
    await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 15_000 });
  });
});
