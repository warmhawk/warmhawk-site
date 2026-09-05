import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DomainCheckPage from './page';
import { domainCheckFaqItems } from '@/lib/faqContent';

/**
 * Copy audit (2026-09-03) regression coverage: this page used to claim it checks "whether [a
 * domain] has a working RFC 8058 ... header," which is false — List-Unsubscribe/List-Unsubscribe-
 * Post are headers on a sent message, not a DNS record, so there's structurally nothing to check
 * for a bare domain (see DomainCheckTool.tsx's own header comment and the page.tsx audit comment).
 * These tests pin the corrected claims: a check is only claimed for what's actually DNS-checkable.
 */
describe('DomainCheckPage (app/tools/domain-check/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and only claims a live check for SPF/DKIM/DMARC + blocklist, not List-Unsubscribe', () => {
    render(createElement(DomainCheckPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Check any sending domain’s deliverability setup, free.',
    );

    const answer = screen.getByText(/live SPF, DKIM, and DMARC status/i);
    expect(answer).toBeInTheDocument();
    expect(answer.textContent).toMatch(/can.t be verified from a bare domain/i);
  });

  it('does not claim the tool checks or verifies a working RFC 8058 header for a bare domain', () => {
    render(createElement(DomainCheckPage));

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/has a working RFC 8058/i);
    expect(bodyText).not.toMatch(/verify(?:ing)? (?:the|a) RFC 8058/i);
  });

  it('no longer carries the Gmail November 2025 enforcement paragraph (moved to the homepage)', () => {
    render(createElement(DomainCheckPage));

    expect(
      screen.queryByText(/Gmail escalated its non-compliant bulk-sender enforcement/i),
    ).toBeNull();
  });

  it('never lists List-Unsubscribe among the checks the paid dashboard runs continuously', () => {
    render(createElement(DomainCheckPage));

    // The stripped claim's last hiding place: the "is this the same check WarmHawk runs
    // continuously?" FAQ answered "same underlying SPF/DKIM/DMARC/List-Unsubscribe/blocklist
    // logic". core-engine's `Domain` model carries spfStatus/dkimStatus/dmarcStatus/
    // blocklistStatus and nothing for List-Unsubscribe, so the dashboard cannot be monitoring it.
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/DMARC\s*\/\s*List-Unsubscribe/i);
    expect(bodyText).not.toMatch(/List-Unsubscribe\s*\/\s*blocklist/i);
  });

  it('renders every domain-check FAQ item', () => {
    render(createElement(DomainCheckPage));

    for (const item of domainCheckFaqItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });
});
