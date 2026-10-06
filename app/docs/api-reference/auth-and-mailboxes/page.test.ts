import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import ApiReferenceAuthMailboxesPage from './page';

// The engine signs in to a new mailbox's SMTP and IMAP servers before saving it
// (warmhawk-core-engine routes/mailboxes.ts, lib/mailSignInCheck.ts) and answers 409 / 422 with a
// sentence. These keep the public reference in step with that, word for word where it quotes.
describe('ApiReferenceAuthMailboxesPage (app/docs/api-reference/auth-and-mailboxes/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('says POST /v1/mailboxes signs in first, and lists 409 and 422 in the routes table', () => {
    render(createElement(ApiReferenceAuthMailboxesPage));

    const row = screen.getByText('POST /v1/mailboxes').closest('tr')!;
    expect(row).toHaveTextContent('signs in to the SMTP and IMAP servers first');
    expect(row).toHaveTextContent('409 if the address is already connected');
    expect(row).toHaveTextContent('422 if a sign-in is refused');
  });

  it('documents the sign-in check with a status table and the exact error bodies', () => {
    const { container } = render(createElement(ApiReferenceAuthMailboxesPage));

    const heading = screen.getByRole('heading', { name: 'POST /v1/mailboxes — sign-in check' });
    expect(heading).toHaveAttribute('id', 'sign-in-check');

    const statusTable = screen.getByRole('columnheader', { name: 'Status' }).closest('table')!;
    const statuses = within(statusTable)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('td')?.textContent);
    expect(statuses).toEqual(['201', '409', '422']);
    expect(statusTable).toHaveTextContent('Nothing is saved');
    expect(statusTable).toHaveTextContent('the SMTP refusal is the one reported');

    const text = container.textContent ?? '';
    expect(text).toContain('{ "error": "This mailbox is already connected." }');
    expect(text).toContain(
      "The mail server didn't accept that username and password. Google Workspace and Microsoft 365 usually need an app password here — or use Connect with Google or Connect with Microsoft instead.",
    );
    expect(text).toContain('so WarmHawk couldn’t read replies');
    expect(text).toContain('most mail servers use 587 or 465');
    expect(text).toContain('10 seconds');
  });

  it('never shows a raw provider code as the error a caller gets', () => {
    const { container } = render(createElement(ApiReferenceAuthMailboxesPage));

    for (const block of container.querySelectorAll('pre')) {
      expect(block.textContent).not.toMatch(/EAUTH|ECONNREFUSED|P2002|prisma/i);
    }
  });
});
