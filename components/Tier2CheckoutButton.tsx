'use client';

import { useState } from 'react';
import { track, EVENTS } from '@/lib/analytics';

/**
 * Client-side Tier 2 (Enterprise DFY) checkout trigger — POSTs { tier: 'tier_2' } to
 * /api/checkout/session and redirects to the returned Stripe Checkout URL, same pattern as
 * CheckoutButtons.tsx (Tier 1) but simpler: a one-time $1,999 fee has no monthly/annual toggle.
 *
 * 2026-09-03: replaces the "Talk to us" scoping-call gate — Tier 2 is now a real self-serve
 * purchase. ContactSalesForm still exists alongside this, but as an optional async intake
 * questionnaire, not a prerequisite for buying.
 */
export function Tier2CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    track(EVENTS.checkoutStart, { tier: 'tier_2' });
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'tier_2' }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Checkout is not configured in this environment yet.');
      }
    } catch {
      setError('Could not reach the checkout endpoint.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-7">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="btn btn-primary btn-block disabled:opacity-60"
      >
        {loading ? 'Starting checkout…' : 'Buy setup — $1,999'}
      </button>
      {error && <p className="text-fail text-sm mt-3 text-center">{error}</p>}
      <p className="text-xs text-ink-muted text-center mt-4">
        One-time setup fee, secured by Stripe. No retainer, no recurring charge.
      </p>
    </div>
  );
}
