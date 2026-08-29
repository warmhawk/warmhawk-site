import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DocsIntroductionPage from './page';
import { tiers } from '@/lib/tierConfig';

describe('DocsIntroductionPage (app/docs/introduction/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1, and a summary card for every tier in lib/tierConfig', () => {
    render(createElement(DocsIntroductionPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WarmHawk, in one page.');

    // "The three tiers" section renders one card per lib/tierConfig entry —
    // this is the marketing-site copy of the tier matrix the file's own
    // header comment warns must not drift, so at minimum every tier's name
    // and price should actually be on the page.
    for (const tier of tiers) {
      expect(screen.getByText(tier.name)).toBeInTheDocument();
      expect(screen.getByText(tier.price)).toBeInTheDocument();
    }

    expect(screen.getByRole('link', { name: 'the pricing comparison' })).toHaveAttribute(
      'href',
      '/compare/pricing',
    );
  });

  it('links to the docs quickstart, guides, self-hosting, and API reference next-step pages', () => {
    render(createElement(DocsIntroductionPage));

    expect(screen.getByRole('link', { name: 'Quickstart & installation' })).toHaveAttribute(
      'href',
      '/docs/quickstart',
    );
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute(
      'href',
      '/docs/guides/connecting-mailboxes',
    );
    expect(screen.getByRole('link', { name: 'Self-hosting' })).toHaveAttribute(
      'href',
      '/docs/self-hosting/architecture',
    );
    expect(screen.getByRole('link', { name: 'API reference' })).toHaveAttribute(
      'href',
      '/docs/api-reference/auth-and-mailboxes',
    );
  });
});
