import { test, expect } from '@playwright/test';
import { target } from './targets';

/**
 * Real "watch this domain" journey: /tools/domain-check -> real gate form submit -> real
 * warmhawk-probe /watch call -> the "check your inbox" confirmation state. Follows the established
 * human-journey convention of a real dependency round trip, never mocked (see
 * checkout-and-license.spec.ts) — here "real dependency" means the site's own proxy routes and a
 * live warmhawk-probe deployment.
 *
 * 🔴 KNOWN GAP (email-provider migration, 2026-09-06): this spec used to continue past the submit
 * by polling the email provider's own REST API for the delivered confirm email, extracting the
 * confirm/unsubscribe links from its body, and driving both. The current email provider's own
 * sent-log API is metadata-only — it never returns a delivered message's body — so that whole tail
 * is no longer possible without warmhawk-probe growing its own send-side capture endpoint (the
 * process logs what it itself just sent, rather than asking the provider to hand the body back).
 * Until that exists, this spec verifies only that a real watch submission reaches the "check your
 * inbox" state; it does not verify the confirm or unsubscribe steps. See
 * app/api/stripe/webhook/route.integration.test.ts's module doc for the same gap on the
 * checkout/license side.
 */
test.describe('Human journey: real domain watch submit', () => {
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
