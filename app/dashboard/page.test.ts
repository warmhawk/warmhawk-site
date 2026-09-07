import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DashboardPage from './page';
import { tiers } from '@/lib/tierConfig';

const tier1 = tiers.find((t) => t.id === 'self-hosted-pro')!;

/**
 * Real screenshots of the actual operator dashboard, not mockups — see
 * notes/3-implementation/09-07-26-dashboard-nav-and-tier-buyer-docs.md for how they were
 * captured. This pins: the h1, a working Tier 1 checkout CTA, all four real screenshots present
 * with real <img src>, and the tier1 feature list rendered from lib/tierConfig (the same
 * single-source-of-truth every other tier-copy page on this site uses).
 */
describe('DashboardPage (app/dashboard/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and the Tier 1 checkout CTA', () => {
    render(createElement(DashboardPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'The dashboard you run day to day',
    );

    const cta = screen.getByRole('link', { name: new RegExp(tier1.ctaLabel) });
    expect(cta).toHaveAttribute('href', '/checkout?tier=1');
  });

  it('renders all four real dashboard screenshots with real image sources', () => {
    render(createElement(DashboardPage));

    const expected = [
      ['/dashboard-screens/queue.png', 'Live Queue'],
      ['/dashboard-screens/domains.png', 'Domain Health'],
      ['/dashboard-screens/team.png', 'Team members'],
      ['/dashboard-screens/security.png', 'Security'],
    ] as const;

    for (const [src, altFragment] of expected) {
      // Each screenshot now renders twice — the visible thumbnail and its zoomed-in copy inside
      // the lightbox overlay (see the "wires every screenshot to its own zoom overlay" test below)
      // — both carrying the same alt text by design, so every match must resolve to this src.
      const imgs = screen.getAllByAltText(new RegExp(altFragment));
      expect(imgs.length).toBe(2);
      for (const img of imgs) {
        expect(img).toHaveAttribute('src', src);
      }
    }
  });

  /**
   * On a phone these screenshots render at ~360px wide — too small to read a table row or the
   * 2FA QR code. Each one is wrapped in a CSS-only (`:target`-driven, no client JS) lightbox, the
   * same "native HTML carries the interaction" approach as CodeBlock's <details>. This pins the
   * wiring end to end: each trigger link's href resolves to a lightbox with a matching id, that
   * lightbox contains the same real image at full size, and it has a close control.
   */
  it('wires every screenshot to its own zoom overlay with a matching id', () => {
    const { container } = render(createElement(DashboardPage));

    const expectedIds = ['queue', 'domains', 'team', 'security'];

    for (const id of expectedIds) {
      const trigger = container.querySelector(`a[href="#zoom-${id}"]`);
      expect(trigger).not.toBeNull();

      const overlay = container.querySelector(`#zoom-${id}`);
      expect(overlay).not.toBeNull();

      // The overlay's own <img> must carry the exact same src as the thumbnail inside the trigger
      // — a zoom that shows a *different* (or missing) image would be worse than no zoom at all.
      const thumbnailSrc = trigger!.querySelector('img')!.getAttribute('src');
      const zoomedImg = overlay!.querySelector('img');
      expect(zoomedImg).not.toBeNull();
      expect(zoomedImg).toHaveAttribute('src', thumbnailSrc);

      // Closing works with no JS: at least one link inside the overlay clears the URL fragment.
      const closeLinks = overlay!.querySelectorAll('a[href="#"]');
      expect(closeLinks.length).toBeGreaterThan(0);
    }
  });

  it('hides every zoom overlay until its fragment is the active target', () => {
    const { container } = render(createElement(DashboardPage));

    const overlays = container.querySelectorAll('[id^="zoom-"]');
    expect(overlays.length).toBe(4);
    for (const overlay of overlays) {
      // `hidden` (display:none) is the base state; `target:block`/`sm:target:flex` only win once
      // the browser's URL fragment matches this element's id — jsdom doesn't evaluate :target, so
      // this asserts the class wiring that makes that behavior possible, not the computed style.
      expect(overlay.className).toContain('hidden');
      expect(overlay.className).toContain('target:block');
      expect(overlay.className).toContain('sm:target:flex');
    }
  });

  it('lists every Tier 1 feature from lib/tierConfig', () => {
    render(createElement(DashboardPage));

    for (const feature of tier1.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('links out to the full pricing comparison', () => {
    render(createElement(DashboardPage));

    expect(screen.getByRole('link', { name: 'the pricing comparison' })).toHaveAttribute(
      'href',
      '/compare/pricing',
    );
  });
});
