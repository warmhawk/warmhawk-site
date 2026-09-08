import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PricingTable } from './PricingTable';
import { tiers } from '@/lib/tierConfig';

/**
 * Copy audit (2026-09-03): Tier 2 used to be repriced with a $300/mo retainer on top of the
 * setup fee, and one card carried a "Most agencies start here" badge that no longer matches
 * Tier 2's setup-only positioning. Both are gone — this pins that regression.
 */
describe('PricingTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders every tier from lib/tierConfig with its price and CTA', () => {
    render(createElement(PricingTable));

    for (const tier of tiers) {
      expect(screen.getByText(tier.tierLabel)).toBeInTheDocument();
      expect(screen.getByText(tier.priceAmount)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: tier.ctaLabel })).toHaveAttribute(
        'href',
        tier.ctaHref,
      );
    }
  });

  it('never renders a "Most agencies start here" badge', () => {
    render(createElement(PricingTable));

    expect(screen.queryByText(/most agencies start here/i)).toBeNull();
  });

  it('prices Tier 2 as a one-time setup fee, never a monthly retainer', () => {
    render(createElement(PricingTable));

    expect(screen.getByText('$1,999')).toBeInTheDocument();
    expect(screen.queryByText(/\$300\/mo/)).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(/retainer/i);
  });

  it('offers a White-Label/MSP contact link, not a 4th priced tier', () => {
    render(createElement(PricingTable));

    expect(screen.getByText('White-Label / MSP')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Contact us' });
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:hello@warmhawk.com'));
    expect(tiers.map((t) => t.id)).toEqual(['open-core', 'self-hosted-pro', 'enterprise-dfy']);
  });

  /**
   * Copy audit (2026-09-08): "BYO-cert support" was listed as a Tier 2 bullet even though the
   * comparison matrix (app/compare/pricing/page.tsx) already marks it "Yes" at every tier —
   * self-hosted means the customer's own box, so cert control was never Tier-2-exclusive. Pinning
   * its removal, and pinning its replacement, which IS gated by the real isTier2 flag in
   * warmhawk-enterprise-operator (badge-embed-panel, certificate/compliance PDFs,
   * lookalike-domain monitoring).
   */
  it('never claims BYO-cert support as a Tier 2 exclusive', () => {
    render(createElement(PricingTable));

    expect(screen.queryByText(/BYO-cert support/i)).toBeNull();
  });

  it('lists Tier 2 dashboard extras that are actually gated behind isTier2 in the operator app', () => {
    render(createElement(PricingTable));

    expect(
      screen.getByText(/trust badge embed, certificate & compliance PDFs, lookalike-domain monitoring/i),
    ).toBeInTheDocument();
  });
});
