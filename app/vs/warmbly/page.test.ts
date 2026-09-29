import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import WarmblyComparisonPage from './page';

describe('WarmblyComparisonPage (app/vs/warmbly/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1', () => {
    render(createElement(WarmblyComparisonPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Two self-hostable engines, two very different deals underneath.',
    );
  });

  it('states plainly that WarmHawk is BSL, not open source, and that Warmbly is Apache-2.0', () => {
    render(createElement(WarmblyComparisonPage));

    expect(screen.getAllByText(/Business Source License/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Apache 2\.0|Apache-2\.0/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/not OSI open source, and we.re not going to call it that/),
    ).toBeInTheDocument();
  });

  it('renders the compare table with the expected rows and no deliverability-signal row', () => {
    render(createElement(WarmblyComparisonPage));

    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
    expect(screen.getByText('License')).toBeInTheDocument();
    expect(screen.getByText('Hosting model')).toBeInTheDocument();
    expect(screen.getByText('Warmup approach')).toBeInTheDocument();
    expect(screen.getByText('AI personalization')).toBeInTheDocument();
    expect(screen.getByText('Guardrails')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.queryByText('Deliverability signal')).not.toBeInTheDocument();
  });

  it('renders "When to pick Warmbly" and "When to pick WarmHawk" sections', () => {
    render(createElement(WarmblyComparisonPage));

    expect(screen.getByText('When to pick Warmbly')).toBeInTheDocument();
    expect(screen.getByText('When to pick WarmHawk')).toBeInTheDocument();
  });

  it('links to the real Warmbly GitHub repo', () => {
    render(createElement(WarmblyComparisonPage));

    expect(screen.getByRole('link', { name: 'github.com/warmbly/warmbly' })).toHaveAttribute(
      'href',
      'https://github.com/warmbly/warmbly',
    );
  });

  it('renders a SoftwareApplication JSON-LD schema and a matching FAQPage schema', () => {
    render(createElement(WarmblyComparisonPage));

    expect(screen.getByText('Is Warmbly actually open source?')).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'SoftwareApplication')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });

  it('has a checkout CTA and a docs CTA', () => {
    render(createElement(WarmblyComparisonPage));

    const checkoutLinks = screen.getAllByRole('link', { name: /Start Tier 1/ });
    expect(checkoutLinks.length).toBeGreaterThan(0);
    checkoutLinks.forEach((link) => expect(link).toHaveAttribute('href', '/checkout?tier=1'));

    expect(screen.getByRole('link', { name: 'Get the free engine' })).toHaveAttribute(
      'href',
      '/docs/quickstart',
    );
  });
});
