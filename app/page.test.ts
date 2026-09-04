import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HomePage from './page';
import { homeFaqItems } from '@/lib/faqContent';

/**
 * Copy audit (2026-09-03) regression coverage for the homepage. Two things pinned here: the Gmail
 * November 2025 enforcement urgency line now lives here (moved from /tools/domain-check, since
 * it's the one hard deadline on the whole site and belongs where every visitor sees it), and the
 * Tier 1/Tier 2 FAQ answers no longer describe Tier 2 as a $300/mo retainer.
 */
describe('HomePage (app/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and every home FAQ item', () => {
    render(createElement(HomePage));

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    for (const item of homeFaqItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('shows the Gmail November 2025 enforcement banner with a link to the free domain checker', () => {
    render(createElement(HomePage));

    expect(screen.getByText(/As of November 2025,/)).toBeInTheDocument();
    expect(
      screen.getByText(/Gmail escalated its non-compliant bulk-sender enforcement/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /check your domain, free/i })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
  });

  it('never describes Tier 2 as a $300/mo retainer anywhere on the page', () => {
    render(createElement(HomePage));

    // The FAQ legitimately says "There's no retainer" — a denial, not a charge — so assert the
    // specific bad pattern (a dollar figure paired with "retainer") is absent, not the word itself.
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/\$300\/mo/);
    expect(bodyText).not.toMatch(/\$\d[\d,]*\s*(?:\/\s*mo|per month)?\s*retainer/i);
  });

  it('the "manage a server myself" FAQ answer describes Tier 2 as done-for-you at setup, not run ongoing', () => {
    render(createElement(HomePage));

    const question = screen.getByText('What if I don’t want to manage a server myself?');
    const answer = question.closest('details')?.querySelector('p');
    expect(answer?.textContent).toMatch(/done-for-you at setup, not run-for-you ongoing/i);
    expect(answer?.textContent).toContain('$1,999');
  });
});
