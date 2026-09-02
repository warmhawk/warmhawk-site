'use client';

import { useState } from 'react';

/**
 * Opens the Stripe Customer Portal for whoever can present a validly-signed WarmHawk license.
 *
 * Same fetch/redirect/error shape as CheckoutButtons.tsx — deliberately, so the two billing
 * entry points behave identically and neither invents its own conventions.
 *
 * The license token is the credential here (see app/api/portal/route.ts's security note): it is
 * the only thing the customer holds that proves which Stripe customer they are. `initialToken`
 * lets the dashboard deep-link straight through with `?token=…` so a locked-out operator never
 * has to go find it, while anyone arriving cold can paste it from their purchase email.
 */
export function BillingPortalForm({ initialToken = '' }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    if (!token.trim()) {
      setError('Paste your license token first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseToken: token.trim() }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Billing is not available in this environment yet.');
      }
    } catch {
      setError('Could not reach the billing endpoint. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-7">
      <label htmlFor="license-token" className="label text-ink-muted block mb-2">
        Your license token
      </label>
      <textarea
        id="license-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={4}
        spellCheck={false}
        placeholder="eyJsaWNlbnNlS2V5Ijoi…"
        className="w-full font-mono text-[12.5px] leading-relaxed bg-cream-elevated border border-border rounded-lg p-3 resize-y focus:outline-none focus:border-rust"
      />
      <p className="text-xs text-ink-muted mt-2 mb-5">
        The long two-part string from your WarmHawk purchase email — the same value you passed to{' '}
        <code className="font-mono">--license</code> at install, stored on your server as{' '}
        <code className="font-mono">WARMHAWK_LICENSE_KEY</code> in{' '}
        <code className="font-mono">.env</code>. Not the short{' '}
        <code className="font-mono">whk_live_</code> identifier.
      </p>
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        className="btn btn-primary btn-block disabled:opacity-60"
      >
        {loading ? 'Opening billing…' : 'Open billing portal'}
      </button>
      {error && <p className="text-fail text-sm mt-3">{error}</p>}
      <p className="text-xs text-ink-muted mt-4">
        Update your card, download invoices, switch monthly ⇄ annual, or cancel — all self-serve. An
        expired license still opens the portal, so a lapsed subscription can always be renewed from
        here.
      </p>
    </div>
  );
}
