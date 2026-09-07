import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Nav } from './Nav';
import { mainNav } from '@/lib/siteConfig';

/**
 * The free domain-check tool shipped with a footer link and one homepage
 * callout but no header entry, so it had no path from any page beyond the
 * homepage. This pins the fix: every mainNav entry (including the new
 * "Domain Check" one) renders as a link with the right href, and it appears
 * twice — once in the desktop row, once in the mobile disclosure menu — since
 * Nav.tsx maps over mainNav in both places.
 */
describe('Nav', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders every mainNav entry as a link with its configured href, in both the desktop row and the mobile menu', () => {
    render(createElement(Nav));

    for (const item of mainNav) {
      const links = screen.getAllByRole('link', { name: item.label });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute('href', item.href);
      }
    }
  });

  it('includes a "Domain Check" entry pointing at the tool', () => {
    expect(
      mainNav.some((item) => item.label === 'Domain Check' && item.href === '/tools/domain-check'),
    ).toBe(true);
  });

  it('links "Dashboard" to the real dashboard page, in both the desktop row and the mobile menu', () => {
    render(createElement(Nav));

    const links = screen.getAllByRole('link', { name: 'Dashboard' });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/dashboard');
    }
  });
});
