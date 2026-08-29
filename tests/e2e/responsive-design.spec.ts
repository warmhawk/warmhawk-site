import { test, expect, type Page } from '@playwright/test';

/**
 * Site-wide responsive-design coverage across modern device classes, written after a manual QA
 * pass (this repo, see Nav.tsx's and DocsSidebar.tsx's own header comments) found three real bugs:
 *
 *   1. Below `lg`, the primary nav links (Product/Compare/Pricing/Docs/Dashboard) were completely
 *      unreachable on any phone or small tablet — no hamburger, no alternative path. Fixed with a
 *      `<details>` disclosure menu in Nav.tsx.
 *   2. Every single page on the site overflowed horizontally by 79px at exactly 768px width (an
 *      iPad Mini/Air held in portrait, not an edge case) — the old `md` (768px) breakpoint for
 *      showing the full desktop nav row left it no room to fit. Fixed by moving that breakpoint to
 *      `lg` (1024px).
 *   3. Every text input on the site's two lead-gen forms (domain-check tool, Tier 2 contact form)
 *      used a sub-16px font-size, which triggers an unwanted auto-zoom on focus in iOS Safari.
 *      Fixed by bumping both to exactly 16px.
 *
 * `mobile-responsive.spec.ts` already regression-tests one specific historical bug (a header CTA's
 * forced `whitespace-nowrap`) at a single 390px viewport; this file is the broader, ongoing
 * responsive-design suite: a real device-width matrix run across a representative route sample,
 * plus dedicated tests for the three bugs above so none of them can silently come back.
 *
 * `/vs/instantly` is deliberately excluded from every route list here — it 404s unless
 * `ENABLE_VS_INSTANTLY` is set, an intentional feature flag (see app/vs/instantly/page.tsx's own
 * header comment), not a responsive-design defect.
 */

const VIEWPORTS = [
  { name: 'Phone — Galaxy S8 (Android, narrow)', width: 360, height: 740 },
  { name: 'Phone — iPhone 14', width: 390, height: 844 },
  { name: 'Tablet portrait — iPad Mini (exactly the old `md` breakpoint)', width: 768, height: 1024 },
  { name: 'Tablet landscape / small laptop — iPad (exactly the `lg` breakpoint)', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

// A representative sample, not the full 33-route site: one of each distinct layout pattern
// (homepage sections, docs index, a docs article with the sidebar, both checkout tabs, a
// comparison table, a data table, a simple content page, a client-side form/tool page).
const ROUTES = [
  '/',
  '/docs',
  '/docs/introduction',
  '/checkout',
  '/checkout?tier=2',
  '/compare/pricing',
  '/tools/domain-check',
  '/vs/smartlead',
  '/legal/privacy',
];

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

test.describe('Device-width matrix: no page fits worse than page-wide horizontal scroll', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const route of ROUTES) {
        test(`${route} has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const overflow = await hasHorizontalOverflow(page);
          expect(
            overflow.scrollWidth,
            `${route} at ${viewport.width}x${viewport.height}: document.documentElement.scrollWidth ` +
              `(${overflow.scrollWidth}px) exceeds clientWidth (${overflow.clientWidth}px).`,
          ).toBeLessThanOrEqual(overflow.clientWidth);
        });
      }
    });
  }
});

test.describe('Nav breakpoint regression: hamburger below `lg`, full link row at `lg` and above', () => {
  // Exact-pixel checks at the two widths where this previously broke (768px overflowed; the
  // breakpoint itself was at 1024px) rather than round numbers, so a regression here is caught at
  // the actual edge instead of somewhere comfortably inside either state.
  test('at 1023px (just below `lg`) the hamburger toggle shows and the desktop link row is hidden', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1023, height: 800 });
    await page.goto('/');
    await expect(page.locator('details.lg\\:hidden')).toBeVisible();
    await expect(page.locator('div.hidden.lg\\:flex')).toBeHidden();
  });

  test('at 1024px (`lg`) the desktop link row shows and the hamburger toggle is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/');
    await expect(page.locator('div.hidden.lg\\:flex')).toBeVisible();
    await expect(page.locator('details.lg\\:hidden')).toBeHidden();
  });

  test('at 768px specifically (the width that used to overflow by 79px on every page) there is no overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});

test.describe('Mobile hamburger menu: every primary nav link is reachable below `lg`', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('is closed by default, then opening it reveals Product, Compare, Pricing, Docs, and Dashboard', async ({
    page,
  }) => {
    await page.goto('/');

    const menuToggle = page.getByLabel('Open menu');
    await expect(menuToggle).toBeVisible();

    const dropdown = page.locator('details.lg\\:hidden nav');
    await expect(dropdown).toBeHidden();

    await menuToggle.click();
    await expect(dropdown).toBeVisible();

    for (const label of ['Product', 'Compare', 'Pricing', 'Docs']) {
      await expect(dropdown.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(dropdown.getByRole('link', { name: /Dashboard/ })).toBeVisible();
  });
});

test.describe('Docs sidebar: collapsed accordion below `md`, always-expanded at `md` and above', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('starts collapsed naming the current page, then expands to reveal the rest of the doc nav', async ({
    page,
  }) => {
    await page.goto('/docs/introduction');

    const accordion = page.locator('details.md\\:hidden');
    await expect(accordion.locator('summary')).toContainText('Introduction');

    const otherLink = accordion.getByRole('link', { name: 'Quickstart & installation' });
    await expect(otherLink).toBeHidden();

    await accordion.locator('summary').click();
    await expect(otherLink).toBeVisible();
  });

  test('at `md` and above, the full doc nav is visible with no accordion to expand', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/docs/introduction');

    await expect(page.locator('details.md\\:hidden')).toBeHidden();
    const nav = page.locator('div.hidden.md\\:block');
    await expect(nav.getByRole('link', { name: 'Quickstart & installation' })).toBeVisible();
  });
});

test.describe('Form inputs stay at/above 16px (below that, iOS Safari auto-zooms the page on focus)', () => {
  test('the domain-check tool input', async ({ page }) => {
    await page.goto('/tools/domain-check');
    const fontSize = await page
      .locator('#domain-check-input')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('every field in the Tier 2 contact-sales form', async ({ page }) => {
    await page.goto('/checkout?tier=2');
    const fields = page.locator('form input, form textarea');
    const count = await fields.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const fontSize = await fields.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize, `contact-sales field #${i} font-size`).toBeGreaterThanOrEqual(16);
    }
  });
});
