'use client';

import { useState, type FormEvent } from 'react';

/**
 * Tier 2 (Enterprise DFY) setup-intake form — POSTs to /api/contact-sales, an optional,
 * non-blocking questionnaire (never a Stripe charge; see app/api/contact-sales/route.ts). It sits
 * alongside Tier2CheckoutButton, the actual $1,999 self-serve purchase — this form doesn't gate or
 * schedule that purchase, it just hands the founder DNS/volume details ahead of setup for anyone
 * who wants to fill it in first. Follows the same fetch/loading/error-state shape as
 * components/CheckoutButtons.tsx and components/DomainCheckTool.tsx — this repo's established
 * pattern for a client-side form hitting this site's own API.
 *
 * Responsive fix: every field below was `text-[15px]` — one pixel under the 16px threshold
 * below which iOS Safari auto-zooms the whole page when the field gains focus. Reachable from a
 * phone, so every mobile visitor got an unwanted pinch-zoom on the very first tap. Bumped to
 * exactly 16px (see the matching `.field` fix in globals.css for the same bug in
 * DomainCheckTool's input).
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
        <div className="font-display text-xl font-semibold mb-2">Thanks — details received.</div>
        <p className="text-sm text-ink-muted">
          A founder reads every Tier 2 setup form personally and replies by email — no call
          required. Already bought Tier 2? This just speeds up setup. Haven&rsquo;t yet? Use the
          purchase button above whenever you&rsquo;re ready. Anything urgent, email{' '}
          <a href="mailto:hello@warmhawk.com" className="text-rust font-semibold">
            hello@warmhawk.com
          </a>{' '}
          directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-7 flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink-muted mb-1">
        Optional: send over your DNS, migration, and volume details ahead of time so setup starts
        faster. This form doesn&rsquo;t charge a card and doesn&rsquo;t book a call — buy Tier 2
        with the button above whenever you&rsquo;re ready, in any order relative to this.
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
        {state === 'submitting' ? 'Sending…' : 'Send setup details'}
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-fail text-sm text-center">{errorMessage}</p>
      )}
    </form>
  );
}
