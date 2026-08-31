'use client';

import { useState } from 'react';
import { track, EVENTS } from '@/lib/analytics';

/**
 * Client-side Tier 1 checkout trigger — POSTs to /api/checkout/session
 * (see app/api/checkout/session/route.ts) and redirects the browser to
 * the returned Stripe Checkout URL. Includes the monthly/annual toggle
 * called for in Monetization & Tiering Strategy ("offered as a toggle at
 * checkout and in the Customer Portal").
 *
 * This never calls Stripe directly from the browser — it only talks to
 * this repo's own API route, which is itself a skeleton that is never
 * invoked against a real Stripe account in this build/test environment.
 */
export function CheckoutButtons() {
  const [interval, setInterval_] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    track(EVENTS.checkoutStart, { billing_interval: interval });
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
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
    <div id="checkout" className="card p-7">
      <div className="flex items-center justify-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => setInterval_('monthly')}
          className={`btn btn-sm ${interval === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Monthly · $199/mo
        </button>
        <button
          type="button"
          onClick={() => setInterval_('annual')}
          className={`btn btn-sm ${interval === 'annual' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Annual · $1,990/yr
        </button>
      </div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="btn btn-primary btn-block disabled:opacity-60"
      >
        {loading ? 'Starting checkout…' : 'Start your install — Self-Hosted Pro'}
      </button>
      {error && <p className="text-fail text-sm mt-3 text-center">{error}</p>}
      <p className="text-xs text-ink-muted text-center mt-4">
        30-day money-back guarantee · Secured by Stripe. Cancel or switch monthly ⇄ annual any time
        from the Stripe Customer Portal — no support ticket required.
      </p>
    </div>
  );
}
