import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PricingComparisonPage from './page';
import { pricingFaqItems } from '@/lib/faqContent';

/**
 * Copy audit (2026-09-03) regression coverage: Tier 2 was repriced from "$999 setup + $300/mo
 * retainer" to a flat $1,999 one-time setup fee with no ongoing subscription, and a cost-at-scale
 * comparison table was added so the page backs up its "one flat fee" claim with real numbers
 * instead of just asserting it.
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

  it('labels the Tier 2 matrix column and the 30-day guarantee row as one-time, not a subscription', () => {
    render(createElement(PricingComparisonPage));

    expect(screen.getAllByText('Tier 2 — $1,999 one-time').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('N/A — one-time setup fee, not a subscription')).toBeInTheDocument();
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
