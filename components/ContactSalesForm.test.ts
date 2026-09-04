import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactSalesForm } from './ContactSalesForm';

/**
 * Regression guard for the Tier 2 (Enterprise DFY) contact form — the checkout page's own test
 * (app/checkout/page.test.ts) only confirms this form mounts when its tab is active; the actual
 * submit → success/error state machine had zero coverage before this file. No JSX, matching
 * DomainCheckTool.test.ts's documented reason (this repo's Vitest/oxc setup for .test.ts files).
 */
function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Acme Outreach' } });
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex Rivera' } });
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'alex@acme.test' } });
  fireEvent.change(screen.getByLabelText('Approx. client domains / mailboxes'), {
    target: { value: '24 domains, 60 mailboxes' },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /send setup details/i }));
}

describe('ContactSalesForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('POSTs the composed fields to /api/contact-sales and shows the success card', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ received: true }),
      } as Response),
    );
    vi.stubGlobal('fetch', fetchSpy);

    render(createElement(ContactSalesForm));
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Anything else we should know'), {
      target: { value: 'Migrating off Instantly' },
    });
    submit();

    expect(await screen.findByText(/thanks — details received/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/contact-sales',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          company: 'Acme Outreach',
          name: 'Alex Rivera',
          email: 'alex@acme.test',
          volume: '24 domains, 60 mailboxes',
          notes: 'Migrating off Instantly',
        }),
      }),
    );
    // The success card replaces the form outright — the fields are gone, not just hidden.
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
  });

  it('shows "Sending…" and disables the submit button while the request is in flight', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );

    render(createElement(ContactSalesForm));
    fillRequiredFields();
    submit();

    const button = await screen.findByRole('button', { name: /sending…/i });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve({ received: true }) } as Response);
    await waitFor(() => expect(screen.queryByText(/sending…/i)).not.toBeInTheDocument());
  });

  it('shows the server-provided error message and keeps the form filled in when the API rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Please provide a work email address.' }),
        } as Response),
      ),
    );

    render(createElement(ContactSalesForm));
    fillRequiredFields();
    submit();

    expect(await screen.findByText('Please provide a work email address.')).toBeInTheDocument();
    // Nothing was cleared — the visitor doesn't have to retype the form.
    expect(screen.getByLabelText('Company')).toHaveValue('Acme Outreach');
    expect(screen.getByRole('button', { name: /send setup details/i })).toBeEnabled();
  });

  it('falls back to a generic message when the API rejects with no error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)),
    );

    render(createElement(ContactSalesForm));
    fillRequiredFields();
    submit();

    expect(await screen.findByText(/could not submit your request right now/i)).toBeInTheDocument();
  });

  it('shows a direct-email fallback message when the request throws (network failure)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(createElement(ContactSalesForm));
    fillRequiredFields();
    submit();

    expect(
      await screen.findByText(/could not reach the server\. email hello@warmhawk\.com directly/i),
    ).toBeInTheDocument();
  });
});
