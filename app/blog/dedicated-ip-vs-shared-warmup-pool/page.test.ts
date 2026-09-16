import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DedicatedIpVsSharedWarmupPoolPost from './page';

describe('DedicatedIpVsSharedWarmupPoolPost (app/blog/dedicated-ip-vs-shared-warmup-pool/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 matching the blogPosts entry title', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Dedicated IP vs Shared Warmup Pool: The Reputation Risk Nobody Explains',
    );
  });

  it('links back to the blog index', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });

  it('cross-links to the what-is-email-warmup post', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(
      screen.getByRole('link', { name: 'warmup still takes the same 2-4 weeks' }),
    ).toHaveAttribute('href', '/blog/what-is-email-warmup');
  });

  it('links to the blocklist checker, domain check, and both vendor comparison pages', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(screen.getByRole('link', { name: 'Blocklist checker →' })).toHaveAttribute(
      'href',
      '/tools/blacklist-checker',
    );
    expect(screen.getByRole('link', { name: 'Full domain health check →' })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
    expect(screen.getByRole('link', { name: 'WarmHawk vs Smartlead →' })).toHaveAttribute(
      'href',
      '/vs/smartlead',
    );
    expect(screen.getByRole('link', { name: 'WarmHawk vs Lemlist →' })).toHaveAttribute(
      'href',
      '/vs/lemlist',
    );
  });

  it('renders every FAQ question and a matching FAQPage JSON-LD schema', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(
      screen.getByText('How do I know if my warmup tool uses a shared pool?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Is a shared warmup pool always bad?')).toBeInTheDocument();
    expect(
      screen.getByText('Can one bad sender in a shared pool really affect my domain specifically?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Does a dedicated warmup setup cost more than a shared pool?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Does dedicated warmup guarantee better inbox placement?'),
    ).toBeInTheDocument();

    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = Array.from(ldJsonScripts).map((s) => JSON.parse(s.innerHTML));
    expect(schemas.some((s) => s['@type'] === 'BlogPosting')).toBe(true);
    expect(schemas.some((s) => s['@type'] === 'FAQPage')).toBe(true);
  });

  it('cites the Reddit thread about the shared warmup network reputation-block', () => {
    render(createElement(DedicatedIpVsSharedWarmupPoolPost));

    expect(
      screen.getByText(
        /Users have reported a warmup vendor confirming that its own shared warmup network got a customer/,
      ),
    ).toBeInTheDocument();
  });
});
