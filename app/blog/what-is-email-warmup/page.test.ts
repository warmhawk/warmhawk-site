import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import WhatIsEmailWarmupPost from './page';

describe('WhatIsEmailWarmupPost (app/blog/what-is-email-warmup/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 matching the blogPosts entry title', () => {
    render(createElement(WhatIsEmailWarmupPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Email Warmup: The Complete Guide (2026)',
    );
  });

  it('links back to the blog index', () => {
    render(createElement(WhatIsEmailWarmupPost));

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });

  it('cross-links to the dedicated-IP vs shared warmup pool post', () => {
    render(createElement(WhatIsEmailWarmupPost));

    expect(
      screen.getByRole('link', { name: 'the dedicated-vs-shared reputation risk' }),
    ).toHaveAttribute('href', '/blog/dedicated-ip-vs-shared-warmup-pool');
  });

  it('links to all 4 checker tools in the cross-link card', () => {
    render(createElement(WhatIsEmailWarmupPost));

    expect(screen.getByRole('link', { name: 'SPF checker →' })).toHaveAttribute(
      'href',
      '/tools/spf-checker',
    );
    expect(screen.getByRole('link', { name: 'DKIM checker →' })).toHaveAttribute(
      'href',
      '/tools/dkim-checker',
    );
    expect(screen.getByRole('link', { name: 'DMARC checker →' })).toHaveAttribute(
      'href',
      '/tools/dmarc-checker',
    );
    expect(screen.getByRole('link', { name: 'Full domain health check →' })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
  });

  it('renders every FAQ question and a matching FAQPage JSON-LD schema', () => {
    render(createElement(WhatIsEmailWarmupPost));

    expect(screen.getByText('How long does email warmup actually take?')).toBeInTheDocument();
    expect(
      screen.getByText('Can I skip warmup if my domain is already a few years old?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What's the difference between warmup and inbox-placement testing?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Does automated warmup work better than doing it manually?'),
    ).toBeInTheDocument();
    expect(screen.getByText('How do I know if warmup is working or failing?')).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'BlogPosting')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });
});
