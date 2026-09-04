import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PricingComparisonPage from './page';
import { pricingFaqItems } from '@/lib/faqContent';

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
});
