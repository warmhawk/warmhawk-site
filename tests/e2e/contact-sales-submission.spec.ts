import { test, expect } from '@playwright/test';

/**
 * Full functional submission of the Tier 2 (Enterprise DFY) contact-sales form — not covered by
 * human-journey.spec.ts (which switches to the Tier 2 tab and stops there) nor by
 * responsive-design.spec.ts (which only measures field font-sizes on that tab).
 *
 * The POST itself is intercepted rather than left to hit the real endpoint: a genuine submission
 * calls emailSender.sendSalesInquiryEmail (app/api/contact-sales/route.ts), which sends a real
 * inquiry email to hello@warmhawk.com and would burn a send against this project's own documented
 * Resend daily-send-quota constraint on every test run. Everything else here — navigation, the tab
 * switch, real field entry, and the client-side success/error state machine in
 * components/ContactSalesForm.tsx — runs for real in a real browser; only that one network
 * boundary is stubbed.
 */
test.describe('Contact-sales form (Tier 2) submission', () => {
  test('fills in every field and shows the success card on a successful submission', async ({
    page,
  }) => {
    let capturedBody: unknown;
    await page.route('**/api/contact-sales', async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ json: { received: true } });
    });

    await page.goto('/checkout?tier=2');
    await expect(page.getByRole('tab', { name: 'Tier 2 — Enterprise DFY' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByLabel('Company').fill('Acme Outreach Agency');
    await page.getByLabel('Your name').fill('Alex Rivera');
    await page.getByLabel('Work email').fill('alex@acme-outreach.test');
    await page.getByLabel('Approx. client domains / mailboxes').fill('24 domains, 60 mailboxes');
    await page
      .getByLabel('Anything else we should know')
      .fill('Migrating off Instantly next quarter.');

    await page.getByRole('button', { name: 'Request a call' }).click();

    await expect(page.getByText(/thanks — we.ll be in touch/i)).toBeVisible();
    // The success card replaces the form outright.
    await expect(page.getByLabel('Company')).toHaveCount(0);
    expect(capturedBody).toEqual({
      company: 'Acme Outreach Agency',
      name: 'Alex Rivera',
      email: 'alex@acme-outreach.test',
      volume: '24 domains, 60 mailboxes',
      notes: 'Migrating off Instantly next quarter.',
    });
  });

  test('shows the server-provided error message and keeps the form up on a failed submission', async ({
    page,
  }) => {
    await page.route('**/api/contact-sales', async (route) => {
      await route.fulfill({
        status: 502,
        json: {
          error:
            'Could not submit your request right now. Email hello@warmhawk.com directly and we’ll follow up.',
        },
      });
    });

    await page.goto('/checkout?tier=2');
    await page.getByLabel('Company').fill('Acme Outreach Agency');
    await page.getByLabel('Your name').fill('Alex Rivera');
    await page.getByLabel('Work email').fill('alex@acme-outreach.test');
    await page.getByLabel('Approx. client domains / mailboxes').fill('24 domains, 60 mailboxes');

    await page.getByRole('button', { name: 'Request a call' }).click();

    await expect(
      page.getByText(
        /could not submit your request right now\. email hello@warmhawk\.com directly/i,
      ),
    ).toBeVisible();
    // The form stays up (not swapped for the success card) so the visitor can retry.
    await expect(page.getByLabel('Company')).toHaveValue('Acme Outreach Agency');
    await expect(page.getByRole('button', { name: 'Request a call' })).toBeEnabled();
  });
});
