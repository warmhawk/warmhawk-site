import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import InstantlyAlternativesPage from './page';

describe('InstantlyAlternativesPage (app/vs/instantly-alternatives/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1', () => {
    render(createElement(InstantlyAlternativesPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Looking for an Instantly alternative? Here’s the honest short list.',
    );
  });

  it('lists all 5 alternatives with links to the 4 that have dedicated pages', () => {
    render(createElement(InstantlyAlternativesPage));

    expect(screen.getByText('Smartlead')).toBeInTheDocument();
    expect(screen.getByText('Lemlist')).toBeInTheDocument();
    expect(screen.getByText('Woodpecker')).toBeInTheDocument();
    expect(screen.getByText('Apollo')).toBeInTheDocument();
    expect(screen.getByText('Self-hosted / DIY (n8n, etc.)')).toBeInTheDocument();

    const comparisonLinks = screen.getAllByRole('link', {
      name: /full comparison|what that actually takes/,
    });
    const hrefs = comparisonLinks.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/vs/smartlead');
    expect(hrefs).toContain('/vs/lemlist');
    expect(hrefs).toContain('/vs/woodpecker');
    expect(hrefs).toContain('/vs/custom-n8n');
  });

  it('renders the compare table with only the 3 independently-sourced rows', () => {
    render(createElement(InstantlyAlternativesPage));

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(1);
    expect(screen.getByText('Support SLA')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.queryByText('Deliverability signal')).not.toBeInTheDocument();
  });

  it('never links directly to the gated /vs/instantly page', () => {
    render(createElement(InstantlyAlternativesPage));

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/vs/instantly')).toBe(false);
  });

  it('links to the dedicated-IP vs shared warmup pool post and the support mailto', () => {
    render(createElement(InstantlyAlternativesPage));

    expect(
      screen.getByRole('link', { name: 'dedicated IP vs shared warmup pool' }),
    ).toHaveAttribute('href', '/blog/dedicated-ip-vs-shared-warmup-pool');
    expect(screen.getByRole('link', { name: 'support@warmhawk.com' })).toHaveAttribute(
      'href',
      'mailto:support@warmhawk.com',
    );
  });

  it('renders a SoftwareApplication JSON-LD schema and a matching FAQPage schema', () => {
    render(createElement(InstantlyAlternativesPage));

    expect(screen.getByText('What is the best Instantly alternative?')).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'SoftwareApplication')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });

  it('has a checkout CTA and a docs CTA', () => {
    render(createElement(InstantlyAlternativesPage));

    const checkoutLinks = screen.getAllByRole('link', { name: /Start Tier 1/ });
    expect(checkoutLinks.length).toBeGreaterThan(0);
    checkoutLinks.forEach((link) => expect(link).toHaveAttribute('href', '/checkout?tier=1'));

    expect(screen.getByRole('link', { name: 'Get the free engine' })).toHaveAttribute(
      'href',
      '/docs/quickstart',
    );
  });
});
