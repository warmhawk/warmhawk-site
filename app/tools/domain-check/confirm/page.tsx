'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * The one confirmation screen. Its wording is IDENTICAL whether this click just confirmed the
 * watch or re-confirmed an already-active one — the probe's own `/watch/confirm` response is
 * already collapsed to a single `confirmed` status for both cases (see warmhawk-probe's
 * routes/watch.ts), and this page carries that precaution through: there is no branch here that
 * could tell a visitor "you're already watching this" versus "you just started watching this",
 * because that distinction is exactly the account-enumeration oracle Section 3.7 of the
 * implementation doc warns against.
 */

type Outcome = 'checking' | 'confirmed' | 'invalid';

function ConfirmInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [outcome, setOutcome] = useState<Outcome>('checking');

  useEffect(() => {
    if (!token) {
      setOutcome('invalid');
      return;
    }
    let cancelled = false;
    fetch('/api/domain-watch/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((body: unknown) => {
        if (cancelled) return;
        const status = (body as { status?: unknown }).status;
        setOutcome(status === 'confirmed' ? 'confirmed' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setOutcome('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="wrap pt-16 md:pt-24 pb-20">
      <div className="max-w-xl">
        <div className="card p-8">
          {outcome === 'checking' && <p className="text-sm text-ink-muted">Confirming&hellip;</p>}

          {outcome === 'confirmed' && (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">You&rsquo;re all set</h1>
              <p className="text-sm text-ink-muted">
                Every Monday we&rsquo;ll re-run all 5 checks on each domain on your list and email
                you only when a result changes &mdash; never a weekly &ldquo;all fine&rdquo; note.
              </p>
            </>
          )}

          {outcome === 'invalid' && (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">
                This link doesn&rsquo;t work anymore
              </h1>
              <p className="text-sm text-ink-muted mb-5">
                It may have expired or already been used.
              </p>
              <Link href="/tools/domain-check" className="btn btn-primary">
                Start a new watch
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmWatchPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
