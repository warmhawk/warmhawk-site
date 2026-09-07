'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/** Same "one screen, identical wording either way" precaution as the confirm page — see that
 *  file's comment. Clicking twice reads exactly the same as clicking once. */

type Outcome = 'checking' | 'unsubscribed' | 'invalid';

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [outcome, setOutcome] = useState<Outcome>('checking');

  useEffect(() => {
    if (!token) {
      setOutcome('invalid');
      return;
    }
    let cancelled = false;
    fetch('/api/domain-watch/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((body: unknown) => {
        if (cancelled) return;
        const status = (body as { status?: unknown }).status;
        setOutcome(status === 'unsubscribed' ? 'unsubscribed' : 'invalid');
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
          {outcome === 'checking' && <p className="text-sm text-ink-muted">One moment&hellip;</p>}

          {outcome === 'unsubscribed' && (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">
                You&rsquo;re unsubscribed
              </h1>
              <p className="text-sm text-ink-muted">
                You won&rsquo;t receive any more emails about this watch. If this wasn&rsquo;t you,
                you can start a new watch any time from the free domain checker.
              </p>
            </>
          )}

          {outcome === 'invalid' && (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">
                This link doesn&rsquo;t work anymore
              </h1>
              <p className="text-sm text-ink-muted mb-5">
                It may have expired or already been used &mdash; if you meant to stop a watch,
                it&rsquo;s most likely already stopped.
              </p>
              <Link href="/tools/domain-check" className="btn btn-primary">
                Back to the domain checker
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribeWatchPage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
