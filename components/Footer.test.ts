import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { Footer } from './Footer';
import { footerLinks } from '@/lib/siteConfig';

/**
 * The 5 checker landing pages (mx/spf/dkim/dmarc/blacklist-checker) started out folded into the
 * "Resources" column, which grew to 10 items — nearly double every other column's length — and
 * buried the checkers among unrelated docs/support links. This pins the fix: each footer column
 * renders under its own heading with exactly its configured links, and specifically that "Tools"
 * exists as its own column separate from "Resources" (regression guard against re-merging them).
 */
describe('Footer', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ['Product', 'product'],
    ['Compare', 'compare'],
    ['Tools', 'tools'],
    ['Resources', 'company'],
    ['Legal', 'legal'],
  ] as const)('renders the "%s" column with exactly its configured links', (title, key) => {
    render(createElement(Footer));

    const heading = screen.getByText(title);
    const column = heading.parentElement;
    if (!column) throw new Error(`"${title}" column container not found`);

    for (const link of footerLinks[key]) {
      const found = within(column).getByRole('link', { name: link.label });
      expect(found).toHaveAttribute('href', link.href);
    }
    expect(within(column).getAllByRole('link')).toHaveLength(footerLinks[key].length);
  });

  it('splits the 5 checker links + full report into their own "Tools" column, not "Resources"', () => {
    render(createElement(Footer));

    const toolLabels = [
      'MX record checker',
      'SPF record checker',
      'DKIM checker',
      'DMARC checker',
      'Email blacklist checker',
      'Full domain health check',
    ];
    for (const label of toolLabels) {
      expect(footerLinks.tools.some((l) => l.label === label)).toBe(true);
      expect(footerLinks.company.some((l) => l.label === label)).toBe(false);
    }
  });
});
