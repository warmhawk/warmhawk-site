import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SelfHostedColdEmailAlternativesPage from './page';

describe('SelfHostedColdEmailAlternativesPage (app/alternatives/self-hosted-cold-email/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Self-Hosted Cold Email Software: 7 Alternatives Compared (2026)',
    );
  });

  it('lists all 8 tools in the summary table', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(1);

    [
      'WarmHawk',
      'Warmbly',
      'Quickly',
      'Mautic',
      'listmonk',
      'Postal',
      'BillionMail',
      'Sendy',
    ].forEach((name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    });
  });

  it('states plainly that Mautic, listmonk, and Sendy are not cold-outreach tools', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    expect(
      screen.getByText(
        /Not well\. All three are built for sending to lists of people who already opted in/,
      ),
    ).toBeInTheDocument();
  });

  it('states plainly that Postal is a raw MTA with no campaign layer', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    expect(screen.getByText(/Postal is a raw mail transfer agent \(MTA\)/)).toBeInTheDocument();
  });

  it('flags Sendy as a paid proprietary license, not free/open-source self-hosting', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    expect(screen.getByText(/a proprietary, one-time \$69 license/)).toBeInTheDocument();
    expect(
      screen.getByText(/it isn.t self-hosted-free the way the rest of this list is/),
    ).toBeInTheDocument();
  });

  it('never calls WarmHawk open source', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/WarmHawk is open source/);
    expect(screen.getAllByText(/BSL 1\.1|Business Source License/).length).toBeGreaterThan(0);
  });

  it('renders a SoftwareApplication JSON-LD schema and a matching FAQPage schema', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    expect(
      screen.getByText('What is the best open-source Instantly alternative?'),
    ).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'SoftwareApplication')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });

  it('has a checkout CTA and a docs CTA', () => {
    render(createElement(SelfHostedColdEmailAlternativesPage));

    const checkoutLinks = screen.getAllByRole('link', { name: /Start Tier 1/ });
    expect(checkoutLinks.length).toBeGreaterThan(0);
    checkoutLinks.forEach((link) => expect(link).toHaveAttribute('href', '/checkout?tier=1'));

    expect(screen.getAllByRole('link', { name: 'Get the free engine' }).length).toBeGreaterThan(0);
  });
});
