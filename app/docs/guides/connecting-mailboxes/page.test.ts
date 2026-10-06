import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ConnectingMailboxesPage from './page';

// Connect for Microsoft is live, and core's sign-in refusal tells people to use it, so the guide
// must not say it's still coming.
describe('ConnectingMailboxesPage (app/docs/guides/connecting-mailboxes/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('offers Connect with Microsoft, with the admin approval step, and never says it is coming', () => {
    const { container } = render(createElement(ConnectingMailboxesPage));
    const text = container.textContent ?? '';

    expect(text).not.toMatch(/coming/i);
    expect(text).toContain('click Connect with Google or Connect with Microsoft');
    expect(text).toContain('Click Connect with Microsoft.');
    expect(text).toContain('copy the approval link from the Mailboxes page');
  });

  it('says a password is checked before saving and links to the status reference', () => {
    render(createElement(ConnectingMailboxesPage));

    expect(
      screen.getByText(/signs in to the SMTP and IMAP servers once with that password/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API reference' })).toHaveAttribute(
      'href',
      '/docs/api-reference/auth-and-mailboxes#sign-in-check',
    );
  });
});
