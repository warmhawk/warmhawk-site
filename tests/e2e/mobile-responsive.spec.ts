import { test, expect } from '@playwright/test';

// Regression test for a real bug found during this session's manual
// Playwright-MCP QA pass: at a 390x844 mobile viewport, the Nav.tsx primary
// CTA ("Start Tier 1 — $199/mo") forced `whitespace-nowrap` (via the shared
// `.btn` class in app/globals.css) inside a non-wrapping `justify-between`
// header row, so the header couldn't fit inside the viewport and produced a
// page-wide horizontal scrollbar on every single page, including the
// homepage. Fixed in components/Nav.tsx by letting that one button's text
// wrap instead of forcing a single line — see the comment there for the
// full root-cause writeup.
//
// `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
// is the standard, framework-agnostic way to detect page-wide horizontal
// overflow (scrollWidth grows past clientWidth the moment *anything* on the
// page is wider than the viewport, regardless of which element caused it),
// so this both regression-tests the specific Nav bug and acts as a general
// tripwire against the same failure mode reappearing anywhere else.

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const pagesToCheck = [
  { path: '/', label: 'homepage' },
  { path: '/docs', label: 'docs index' },
  { path: '/docs/introduction', label: 'docs article page (with sidebar)' },
  { path: '/checkout', label: 'checkout (tabs layout)' },
];

test.describe('Mobile viewport (390x844): no page-wide horizontal overflow', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  for (const { path, label } of pagesToCheck) {
    test(`${label} (${path}) fits within the viewport width`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        overflow.scrollWidth,
        `${path} has a horizontally-scrollable page: document.documentElement.scrollWidth ` +
          `(${overflow.scrollWidth}px) exceeds clientWidth (${overflow.clientWidth}px) at ` +
          `${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}.`,
      ).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }

  test('the Nav CTA button itself stays inside the viewport', async ({ page }) => {
    await page.goto('/');
    // A plain class-attribute locator, not getByRole+name: the homepage has
    // multiple "Start Tier 1 ..." CTAs (Nav, hero, pricing section), all
    // matching a text-based query. Nav.tsx's is the only link combining
    // `btn-primary` with `btn-sm` (the others are `btn btn-primary` at
    // default size, or `btn-block btn-primary` in PricingTable), so this
    // selects it unambiguously regardless of its label text.
    const cta = page.locator('a.btn-primary.btn-sm');
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box, 'CTA button has no bounding box (not rendered?)').not.toBeNull();
    if (box) {
      expect(
        box.x + box.width,
        `CTA button's right edge (${box.x + box.width}px) exceeds the ${MOBILE_VIEWPORT.width}px viewport`,
      ).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    }
  });
});
