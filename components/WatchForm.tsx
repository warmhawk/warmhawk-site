'use client';

import { useState, type FormEvent } from 'react';
import { useTurnstile } from '@/components/useTurnstile';

/**
 * The gate's real form — replaces the old "Want this watched automatically?" placeholder CTA
 * (see globals.css's `.gate-card` comment on why that placeholder existed: no database or email
 * pipeline until Phase 5). Mirrors the design mockup's `gateHtml()` almost verbatim
 * (notes/2-design/warmhawk-domain-check-probe.html, section 02's "Gate — resting" cell).
 *
 * Its own `useTurnstile()` instance, separate from `DomainCheckTool`'s: a token is single-use and
 * the main check's token is already spent by the time this form is visible.
 */

interface WatchFormProps {
  /** The exact domains the visitor just saw results for — never re-derived from raw input, so the
   *  watch always matches what was on screen. */
  domains: string[];
}

type WatchState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

const GENERIC_ERROR =
  "The domain checker isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.";

export function WatchForm({ domains }: WatchFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<WatchState>({ kind: 'idle' });
  const turnstile = useTurnstile();
  const n = domains.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || state.kind === 'submitting') return;

    setState({ kind: 'submitting' });

    try {
      const res = await fetch('/api/domain-watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email,
          domains: domains.join('\n'),
          ...(turnstile.token ? { turnstileToken: turnstile.token } : {}),
        }),
      });

      // A redeemed token is dead — reset before reading the response either way.
      turnstile.reset();

      if (res.status === 403) {
        setState({
          kind: 'error',
          message:
            "We couldn't confirm you're not a bot. Please complete the check above and try again.",
        });
        return;
      }
      if (res.status === 429) {
        setState({
          kind: 'error',
          message:
            "You've submitted a lot of watch requests. Give it a little while and try again.",
        });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error', message: GENERIC_ERROR });
        return;
      }

      // The probe's response is identical whether this is a brand new signup or a resubmission of
      // an already-active/pending email — see routes/watch.ts's own comment on why (an
      // enumeration-oracle precaution). The UI mirrors that: always "check your inbox", never a
      // branch that reveals which case just happened.
      setState({ kind: 'sent', email });
    } catch {
      setState({ kind: 'error', message: GENERIC_ERROR });
    }
  }

  if (state.kind === 'sent') {
    return (
      <div className="gate-card">
        <h3 className="font-display text-xl font-semibold mb-1.5">Check your inbox</h3>
        <p className="text-sm text-ink-muted max-w-[58ch] mb-0">
          We sent a confirmation link to <b className="text-ink font-semibold">{state.email}</b>.
          Click it and the weekly watch starts across every domain on the list.
        </p>
      </div>
    );
  }

  return (
    <div className="gate-card">
      <h3 className="font-display text-xl font-semibold mb-1.5">
        Watch {n === 1 ? 'this domain' : `all ${n} domains`}
      </h3>
      <p className="text-sm text-ink-muted max-w-[58ch] mb-4">
        Every Monday we re-run all 5 checks on{' '}
        {n === 1 ? 'this domain' : `each of the ${n} domains`} and email you only when a result
        changes &mdash; never a weekly &ldquo;all fine&rdquo; note.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field mb-3">
          <label htmlFor="watch-email">Email</label>
          <input
            id="watch-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourdomain.com"
          />
        </div>

        {/* Rendered only when a site key is configured; an unconfigured widget is a no-op div. */}
        <div ref={turnstile.containerRef} className="mb-3 empty:hidden" />

        {turnstile.state === 'failed' && (
          <p className="text-sm text-ink-muted mb-3">
            The bot check couldn&rsquo;t load. Reload the page to try again.
          </p>
        )}

        <button
          type="submit"
          disabled={state.kind === 'submitting' || !email || turnstile.blocking}
          className="btn btn-primary disabled:opacity-50"
        >
          {state.kind === 'submitting' ? 'Sending…' : 'Email me on changes'}
        </button>
      </form>

      {state.kind === 'error' && <p className="text-sm text-fail mt-3">{state.message}</p>}

      <p className="fine text-[12.5px] text-ink-muted mt-3 max-w-[60ch]">
        <b className="text-ink font-semibold">Confirmation email first.</b> Nothing else sent
        &mdash; no newsletter, no drip, no sales sequence. Unsubscribe in one click, any time.
      </p>
    </div>
  );
}
