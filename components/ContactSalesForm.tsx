'use client';

import { useState, type FormEvent } from 'react';

/**
 * Tier 2 (Enterprise DFY) contact form — POSTs to /api/contact-sales, which creates a sales
 * inquiry (never a Stripe charge; Tier 2 is a custom-scoped engagement, see
 * app/api/contact-sales/route.ts). Follows the same fetch/loading/error-state shape as
 * components/CheckoutButtons.tsx and components/DomainCheckTool.tsx — this repo's established
 * pattern for a client-side form hitting this site's own API.
 *
 * Responsive fix: every field below was `text-[15px]` — one pixel under the 16px threshold
 * below which iOS Safari auto-zooms the whole page when the field gains focus. This form is the
 * entire Tier 2 conversion path, reachable from a phone, so every mobile visitor got an
 * unwanted pinch-zoom on the very first tap. Bumped to exactly 16px (see the matching `.field`
 * fix in globals.css for the same bug in DomainCheckTool's input).
 */
type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ContactSalesForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    setErrorMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      company: String(data.get('company') ?? ''),
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      volume: String(data.get('volume') ?? ''),
      notes: String(data.get('notes') ?? ''),
    };

    try {
      const res = await fetch('/api/contact-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { received?: boolean; error?: string };
      if (res.ok && json.received) {
        setState('success');
      } else {
        setErrorMessage(json.error ?? 'Could not submit your request right now.');
        setState('error');
      }
    } catch {
      setErrorMessage('Could not reach the server. Email hello@warmhawk.com directly.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="card bg-cream-elevated p-7 text-center">
        <div className="font-display text-xl font-semibold mb-2">Thanks — we&rsquo;ll be in touch.</div>
        <p className="text-sm text-ink-muted">
          A founder reads every Enterprise DFY inquiry personally and follows up same business day.
          In the meantime, feel free to email{' '}
          <a href="mailto:hello@warmhawk.com" className="text-rust font-semibold">
            hello@warmhawk.com
          </a>{' '}
          directly with anything urgent.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink-muted mb-1">
        Tier 2 is a custom-scoped engagement — DNS, migration, dedicated IPs, and deployment
        handled by WarmHawk&rsquo;s founder, then an ongoing retainer. Tell us about your setup and
        we&rsquo;ll follow up to schedule a call. This does not charge a card.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Company</span>
          <input
            name="company"
            type="text"
            required
            placeholder="Acme Outreach Agency"
            className="bg-cream border border-border rounded-full px-4 py-3 text-[16px] outline-none focus:border-rust"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Your name</span>
          <input
            name="name"
            type="text"
            required
            placeholder="Alex Rivera"
            className="bg-cream border border-border rounded-full px-4 py-3 text-[16px] outline-none focus:border-rust"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold">Work email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="alex@youragency.com"
          className="bg-cream border border-border rounded-full px-4 py-3 text-[16px] outline-none focus:border-rust"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold">Approx. client domains / mailboxes</span>
        <input
          name="volume"
          type="text"
          required
          placeholder="e.g. 24 domains, 60 mailboxes"
          className="bg-cream border border-border rounded-full px-4 py-3 text-[16px] outline-none focus:border-rust"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold">Anything else we should know</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Migration timeline, current tool, etc."
          className="bg-cream border border-border rounded-2xl px-4 py-3 text-[16px] outline-none focus:border-rust resize-none"
        />
      </label>
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="btn btn-primary btn-block disabled:opacity-60"
      >
        {state === 'submitting' ? 'Sending…' : 'Request a call'}
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-fail text-sm text-center">{errorMessage}</p>
      )}
    </form>
  );
}
