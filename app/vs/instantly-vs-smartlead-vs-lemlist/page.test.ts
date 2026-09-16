import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import InstantlyVsSmartleadVsLemlistPage from './page';

describe('InstantlyVsSmartleadVsLemlistPage (app/vs/instantly-vs-smartlead-vs-lemlist/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Three cold-email platforms, three different bills you didn’t expect.',
    );
  });

  it('renders a compare table for each of the three vendors', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(screen.getByRole('heading', { name: 'WarmHawk vs Instantly' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WarmHawk vs Smartlead' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WarmHawk vs Lemlist' })).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(3);
  });

  it('does not reuse the SEED_PLACEMENT_LIVE_IN_PRODUCTION-gated deliverability-signal row', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(screen.queryByText('Deliverability signal')).not.toBeInTheDocument();
    expect(screen.queryByText(/heat score/i)).not.toBeInTheDocument();
  });

  it('renders only the 3 independently-sourced Instantly rows', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(screen.getAllByText('Support SLA').length).toBeGreaterThan(0);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getAllByText('Infrastructure').length).toBeGreaterThan(0);
  });

  it('links out to the dedicated single-vendor comparison pages', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(screen.getByRole('link', { name: 'WarmHawk vs Smartlead →' })).toHaveAttribute(
      'href',
      '/vs/smartlead',
    );
    expect(screen.getByRole('link', { name: 'WarmHawk vs Lemlist →' })).toHaveAttribute(
      'href',
      '/vs/lemlist',
    );
    expect(
      screen.getByRole('link', { name: 'the dedicated-IP vs shared warmup pool breakdown' }),
    ).toHaveAttribute('href', '/blog/dedicated-ip-vs-shared-warmup-pool');
  });

  it('never links directly to the gated /vs/instantly page', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/vs/instantly')).toBe(false);
  });

  it('renders a SoftwareApplication JSON-LD schema and a matching FAQPage schema', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    expect(
      screen.getByText('Which of the three — Instantly, Smartlead, or Lemlist — is cheapest?'),
    ).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'SoftwareApplication')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });

  it('has a checkout CTA and a docs CTA', () => {
    render(createElement(InstantlyVsSmartleadVsLemlistPage));

    const checkoutLinks = screen.getAllByRole('link', { name: /Start Tier 1/ });
    expect(checkoutLinks.length).toBeGreaterThan(0);
    checkoutLinks.forEach((link) => expect(link).toHaveAttribute('href', '/checkout?tier=1'));

    expect(screen.getByRole('link', { name: 'Get the free engine' })).toHaveAttribute(
      'href',
      '/docs/quickstart',
    );
  });
});
