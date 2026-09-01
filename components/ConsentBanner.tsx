'use client';

// Cookie consent for GA4 + PostHog. Deliberately not a blocking modal: with
// consent withheld both tools still run in their cookieless modes (Consent
// Mode v2 pings / PostHog memory persistence), so declining costs the
// visitor nothing and costs WarmHawk only cross-session identity and session
// replay — consistent with the "no invasive cross-site advertising
// trackers" line in the Privacy Policy's Cookies section.
//
// Wording here has to stay true to /legal/privacy#cookies and to
// lib/analytics.ts.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { writeConsent, type ConsentState } from '@/lib/analytics';

export function ConsentBanner({
  consent,
  onDecide,
}: {
  consent: ConsentState;
  onDecide: (next: Exclude<ConsentState, 'unset'>) => void;
}) {
  // The page is server-rendered with consent 'unset', so rendering the
  // banner on the server would flash it at visitors who already decided.
  // Mount-gating keeps the markup identical between server and first client
  // render, then reveals only if there is genuinely no decision on file.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || consent !== 'unset') return null;

  function decide(next: Exclude<ConsentState, 'unset'>) {
    writeConsent(next);
    onDecide(next);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-paper/95 backdrop-blur px-6 py-5 md:px-10"
    >
      <div className="mx-auto max-w-wrap flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
        <p className="text-sm leading-relaxed text-ink-muted flex-1">
          We measure anonymous traffic with no cookies by default. Allowing cookies lets us see a
          return visit as the same person, which is how we find what&rsquo;s broken in the checkout
          flow. See the{' '}
          <Link href="/legal/privacy#cookies" className="text-rust font-semibold">
            Cookies section
          </Link>{' '}
          of the Privacy Policy.
        </p>
        <div className="flex items-center gap-3 flex-none">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => decide('denied')}>
            Cookieless only
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => decide('granted')}
          >
            Allow cookies
          </button>
        </div>
      </div>
    </div>
  );
}
