import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import InstantlyPricingPost from './page';

describe('InstantlyPricingPost (app/blog/instantly-pricing/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the WarmHawk pricing page', () => {
    render(createElement(InstantlyPricingPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Instantly pricing in 2026: what you actually pay, plan by plan',
    );
    expect(screen.getByRole('link', { name: 'WarmHawk pricing →' })).toHaveAttribute(
      'href',
      '/compare/pricing',
    );
  });

  it('links to the cold email calculator and back to the blog index', () => {
    render(createElement(InstantlyPricingPost));

    expect(screen.getByRole('link', { name: 'Cold email cost calculator →' })).toHaveAttribute(
      'href',
      '/tools/cold-email-calculator',
    );
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});
