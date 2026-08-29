import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// Realistic single-visitor walkthrough against the live, already-built site
// (this repo's Docker container — see playwright.config.ts's header comment
// for why there's no `webServer` block here). Every step asserts on real
// rendered content (headings/labels actually shipped in app/**/page.tsx and
// components/**), and the whole journey fails if the browser logs a single
// console error/warning or an uncaught page error anywhere along the way —
// this is the automated replacement for the manual Playwright-MCP pass done
// earlier this session (34/35 routes 200, zero console errors).
//
// HTTP status is checked with the `request` fixture's own GET against each
// URL the journey lands on, rather than by inspecting in-browser navigation
// responses: App Router `<Link>` clicks are client-side RSC navigations with
// no full-document `Response` to read a status code off of, so a real,
// independent HTTP request per URL is the honest way to assert "this route
// actually returns 200" alongside (not instead of) driving the UI for real.

function trackConsole(page: Page, issues: string[]) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      issues.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    issues.push(`[pageerror] ${err.message}`);
  });
}

test.describe('Human journey: homepage -> docs -> checkout -> vs -> legal', () => {
  test('a visitor can browse the whole site without errors or dead ends', async ({
    page,
    request,
  }) => {
    const consoleIssues: string[] = [];
    trackConsole(page, consoleIssues);

    // 1. Land on the homepage.
    const homeResponse = await page.goto('/');
    expect(homeResponse?.status()).toBe(200);
    await expect(page).toHaveTitle(/WarmHawk/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your sending engine');

    // 2. Open the nav and go to Docs.
    // Note: not scoped to a header container — Next.js 15's App Router now
    // renders a hidden `<div hidden><!--$--><!--/$--></div>` Suspense/metadata
    // marker as body's actual first child (confirmed via curl against the raw
    // server-rendered HTML, 2026-08-29), which broke the previous
    // `page.locator('body > div').first()` positional scoping — that div no
    // longer resolves to the real header. The nav's "Docs" link has a unique
    // accessible name across the whole page (the footer's own docs link is
    // "Docs & quickstart"), so an unscoped exact-match query is both simpler
    // and no longer coupled to body's child ordering.
    await page.getByRole('link', { name: 'Docs', exact: true }).click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(request.get('/docs').then((r) => r.status())).resolves.toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Everything you need to run WarmHawk.',
    );

    // 3. Click into a doc group card (Introduction, under "Get started").
    await page.getByRole('link', { name: 'Introduction' }).click();
    await expect(page).toHaveURL(/\/docs\/introduction$/);
    await expect(request.get('/docs/introduction').then((r) => r.status())).resolves.toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('WarmHawk, in one page.');

    // 4. The sidebar highlights the current page (rust pill), and only that one.
    const sidebar = page.getByRole('navigation').filter({ hasText: 'Get started' });
    const currentLink = sidebar.getByRole('link', { name: 'Introduction' });
    await expect(currentLink).toHaveClass(/bg-rust/);
    const quickstartLink = sidebar.getByRole('link', { name: 'Quickstart & installation' });
    await expect(quickstartLink).not.toHaveClass(/bg-rust/);

    // 5. Click the prev/next footer nav. Introduction is first in reading
    // order, so there is no "prev" link and "next" goes to Quickstart.
    await expect(page.getByRole('link', { name: /^←/ })).toHaveCount(0);
    await page.getByRole('link', { name: /Quickstart & installation →/ }).click();
    await expect(page).toHaveURL(/\/docs\/quickstart$/);
    await expect(request.get('/docs/quickstart').then((r) => r.status())).resolves.toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Install it, then send a real email in six calls.',
    );
    // And now Quickstart's own sidebar entry is the highlighted one.
    await expect(sidebar.getByRole('link', { name: 'Quickstart & installation' })).toHaveClass(
      /bg-rust/,
    );

    // 6. Go to checkout: Tier 1 / Tier 2 tabs render, and switching works.
    const checkoutResponse = await page.goto('/checkout');
    expect(checkoutResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get your license.');

    const tier1Tab = page.getByRole('tab', { name: 'Tier 1 — Self-Hosted Pro' });
    const tier2Tab = page.getByRole('tab', { name: 'Tier 2 — Enterprise DFY' });
    await expect(tier1Tab).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('button', { name: 'Start your install — Self-Hosted Pro' }),
    ).toBeVisible();

    await tier2Tab.click();
    await expect(tier2Tab).toHaveAttribute('aria-selected', 'true');
    await expect(tier1Tab).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByLabel('Company')).toBeVisible();
    // Plain attribute locators (not getByRole) here on purpose: the tier-1
    // panel's `hidden` attribute takes it out of the accessibility tree
    // entirely, so a role-based query for its contents would resolve to
    // zero elements rather than "found but hidden" — still correct for
    // `toBeHidden()`, but a CSS attribute selector is the unambiguous way
    // to assert against the actual DOM node that carries `hidden`.
    await expect(page.locator('[aria-labelledby="tier-1"]')).toBeHidden();
    await expect(page.locator('[aria-labelledby="tier-2"]')).toBeVisible();

    // 7. Visit one /vs/* comparison page.
    const vsResponse = await page.goto('/vs/smartlead');
    expect(vsResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'When a campaign stops mid-send',
    );

    // 8. Visit one legal page.
    const legalResponse = await page.goto('/legal/privacy');
    expect(legalResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
    // A longer, unique substring: "pending attorney review" alone also
    // matches the page's separate DraftBanner <strong> ("DRAFT — pending
    // attorney review, not yet legally ..."), which is a strict-mode
    // violation (2 matches) — this longer phrase only appears once.
    await expect(page.getByText('This document is a draft, pending attorney review')).toBeVisible();

    expect(
      consoleIssues,
      `Console errors/warnings captured during the journey:\n${consoleIssues.join('\n')}`,
    ).toEqual([]);
  });
});
