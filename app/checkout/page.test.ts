import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CheckoutPage from './page';

describe('CheckoutPage (app/checkout/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('defaults to the Tier 1 tab when no ?tier= query param is present', () => {
    render(createElement(CheckoutPage, { searchParams: {} }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get your license.');
    expect(screen.getByRole('tab', { name: 'Tier 1 — Self-Hosted Pro' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Start your install — Self-Hosted Pro' }),
    ).toBeInTheDocument();
  });

  it('starts on the Tier 2 tab when ?tier=2 is passed, and only tier=2 does that', () => {
    render(createElement(CheckoutPage, { searchParams: { tier: '2' } }));

    expect(screen.getByRole('tab', { name: 'Tier 2 — Enterprise DFY' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
  });

  it('falls back to Tier 1 for any tier value other than exactly "2"', () => {
    render(createElement(CheckoutPage, { searchParams: { tier: 'anything-else' } }));

    expect(screen.getByRole('tab', { name: 'Tier 1 — Self-Hosted Pro' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches tabs on click, swapping CheckoutButtons for ContactSalesForm and back', () => {
    render(createElement(CheckoutPage, { searchParams: {} }));

    // Both tab panels stay mounted at all times (CheckoutTabs toggles the
    // `hidden` attribute rather than conditionally rendering), so an
    // inactive panel's form fields are still in the DOM — just not visible
    // or reachable via role queries (which exclude hidden elements from the
    // accessibility tree by default). `toBeVisible`/`not.toBeVisible` is the
    // correct check for a field that's always present; `queryByRole` +
    // `toBeInTheDocument` is the correct check for the button, since a role
    // query on a hidden element already resolves to no match at all.
    fireEvent.click(screen.getByRole('tab', { name: 'Tier 2 — Enterprise DFY' }));
    expect(screen.getByLabelText('Company')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Start your install — Self-Hosted Pro' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tier 1 — Self-Hosted Pro' }));
    expect(
      screen.getByRole('button', { name: 'Start your install — Self-Hosted Pro' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Company')).not.toBeVisible();
  });
});
