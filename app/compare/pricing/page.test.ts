import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PricingComparisonPage from './page';
import { pricingFaqItems } from '@/lib/faqContent';
import { tiers } from '@/lib/tierConfig';

/**
 * Copy audit regression coverage: Tier 2 was repriced from "$999 setup + $300/mo retainer" (an
 * early draft) through a briefly-shipped "flat $1,999 one-time, no ongoing subscription" model,
 * to its correct final shape — a $1,999 one-time setup fee plus the same $199/mo software fee
 * Tier 1 pays. A cost-at-scale comparison table was added so the page backs up its "one flat fee"
 * claim with real numbers instead of just asserting it.
 */
describe('PricingComparisonPage (app/compare/pricing/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and never prices Tier 2 as a monthly retainer', () => {
    render(createElement(PricingComparisonPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'No credits. No per-seat math. One flat fee.',
    );

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/\$300\/mo/);
    expect(bodyText).toContain('$1,999');
  });

  it('labels the Tier 2 matrix column and the 30-day guarantee row as setup fee + $199/mo', () => {
    render(createElement(PricingComparisonPage));

    expect(screen.getByText('Tier 2 — $1,999 one-time + $199/mo')).toBeInTheDocument();
    expect(screen.getByText('Tier 2 — $1,999 one-time setup + $199/mo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Yes — on the $199/mo fee; the $1,999 setup fee is separate and non-refundable',
      ),
    ).toBeInTheDocument();
  });

  it('renders the cost-at-scale comparison table with the solo and large-agency figures', () => {
    render(createElement(PricingComparisonPage));

    expect(screen.getByText(/\$220–400\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000–8,000\+\/mo/)).toBeInTheDocument();
    expect(screen.getAllByText(/\$199\/mo flat/).length).toBeGreaterThan(0);
  });

  it('renders every pricing FAQ item', () => {
    render(createElement(PricingComparisonPage));

    for (const item of pricingFaqItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  /**
   * Copy audit (2026-09-08, second pass): the "Tier 2 exclusive" group on the pricing card
   * (lib/tierConfig.ts's `exclusiveFeatures`) had no matching rows in this matrix at all, a gap
   * named but not yet fixed in the previous pass. Sourced from `tierConfig.ts` rather than a
   * second hardcoded list, so the matrix can't silently drop back out of sync with the card.
   */
  it('gives every Tier 2 exclusive feature its own matrix row, marked Yes only for Tier 2', () => {
    render(createElement(PricingComparisonPage));

    const enterpriseDfy = tiers.find((tier) => tier.id === 'enterprise-dfy');
    expect(enterpriseDfy?.exclusiveFeatures?.length).toBeGreaterThan(0);

    for (const exclusive of enterpriseDfy?.exclusiveFeatures ?? []) {
      // The label also appears on the <PricingTable /> card above the matrix (as a plain <li>) —
      // find the one inside the matrix's <tr> specifically.
      const matches = screen.getAllByText(exclusive.label);
      const row = matches.map((el) => el.closest('tr')).find((tr) => tr !== null);
      expect(row).not.toBeUndefined();
      const cells = Array.from(row?.querySelectorAll('td') ?? []).map((cell) => cell.textContent);
      const [, tier0, tier1, tier2] = cells;
      expect(tier2).toMatch(/yes/i);
      expect(tier0).not.toMatch(/yes/i);
      expect(tier1).not.toMatch(/yes/i);
    }
  });
});
