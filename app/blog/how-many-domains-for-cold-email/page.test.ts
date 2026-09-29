import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HowManyDomainsForColdEmailPost from './page';

describe('HowManyDomainsForColdEmailPost (app/blog/how-many-domains-for-cold-email/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the cold email calculator', () => {
    render(createElement(HowManyDomainsForColdEmailPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How many domains do you need for cold email? The actual math',
    );
    expect(screen.getByRole('link', { name: 'Cold email domain calculator →' })).toHaveAttribute(
      'href',
      '/tools/cold-email-calculator',
    );
  });

  it('links back to the blog index', () => {
    render(createElement(HowManyDomainsForColdEmailPost));

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});
