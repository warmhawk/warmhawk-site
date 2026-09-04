'use client';

// Boots GA4 + PostHog and owns the consent state the banner writes to.
// Mounted once from the root layout; renders nothing but the banner. With
// neither NEXT_PUBLIC_GA4_MEASUREMENT_ID nor NEXT_PUBLIC_POSTHOG_KEY set
// this is inert, which is the state local dev and every test tier build in.
//
// Follows the same consent-gated analytics-boot pattern used in a similar Analytics.tsx
// component elsewhere.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ANALYTICS_ENABLED,
  EVENTS,
  GA4_ENABLED,
  GA4_MEASUREMENT_ID,
  POSTHOG_ENABLED,
  POSTHOG_HOST,
  POSTHOG_KEY,
  isAutomatedClient,
  landingAttribution,
  pageview,
  readConsent,
  track,
  trackCheckoutComplete,
  type ConsentState,
} from '@/lib/analytics';
import { ConsentBanner } from './ConsentBanner';

// gtag.js requires the classic `arguments`-object push — a rest-args wrapper
// pushes an Array, which the tag silently ignores. This is the one place the
// verbatim Google shape has to be preserved.
function bootGa4(consent: ConsentState) {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    // gtag.js reads the raw `arguments` object back off dataLayer; a
    // rest-params wrapper pushes a plain Array, which the tag accepts and
    // then silently ignores. The directive has to sit on the line
    // immediately above the call — a multi-line comment between the two
    // disables the wrong line.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }
  window.gtag = gtag as unknown as typeof window.gtag;

  // Consent Mode v2 defaults must be queued before the config command.
  // Denied analytics_storage still sends cookieless pings, so traffic is
  // countable before anyone touches the banner.
  window.gtag!('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: consent === 'granted' ? 'granted' : 'denied',
    wait_for_update: 500,
  });
  window.gtag!('js', new Date());
  window.gtag!('config', GA4_MEASUREMENT_ID, {
    // The pathname effect below sends page_view by hand on every route
    // change; leaving the automatic one on would double-count the first
    // load.
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

async function bootPostHog(consent: ConsentState) {
  const { default: posthog } = await import('posthog-js');

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Pageviews and route changes are sent by hand (see the pathname
    // effect) — the App Router doesn't fire a full page load on navigation.
    capture_pageview: false,
    capture_pageleave: true,
    // Cookieless until the visitor accepts — memory persistence writes no
    // cookie and no localStorage entry, so it needs no consent to run.
    persistence: consent === 'granted' ? 'localStorage+cookie' : 'memory',
    // Session replay is the reason PostHog is here rather than GA4 alone,
    // but it records a real person's screen — it stays off until they say
    // yes.
    disable_session_recording: consent !== 'granted',
    autocapture: true,
  });
  window.posthog = posthog;

  if (consent === 'granted') posthog.startSessionRecording();
}

function applyConsent(consent: ConsentState) {
  if (GA4_ENABLED) {
    window.gtag?.('consent', 'update', {
      analytics_storage: consent === 'granted' ? 'granted' : 'denied',
    });
  }
  if (POSTHOG_ENABLED && window.posthog) {
    if (consent === 'granted') {
      window.posthog.set_config({ persistence: 'localStorage+cookie' });
      window.posthog.startSessionRecording();
    } else {
      window.posthog.set_config({ persistence: 'memory' });
      window.posthog.stopSessionRecording();
    }
  }
}

export function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState>('unset');
  const booted = useRef(false);
  const lastPath = useRef<string | null>(null);

  // Boot once. Guarded on isAutomatedClient() so the e2e/human-journey
  // Playwright runs never load a tag at all — no beacon, no session replay,
  // no cost.
  useEffect(() => {
    if (booted.current || !ANALYTICS_ENABLED || isAutomatedClient()) return;
    booted.current = true;

    const stored = readConsent();
    setConsent(stored);

    if (GA4_ENABLED) bootGa4(stored);
    if (POSTHOG_ENABLED) void bootPostHog(stored);

    // Funnel step 1. Carries referrer + utm_* so "nobody arrives" and "the
    // wrong people arrive" are distinguishable.
    track(EVENTS.landingView, landingAttribution());
  }, []);

  // Funnel step 2 rides on the same effect as the SPA-style pageview:
  // /compare/pricing is the page whose drop-off tells you the homepage
  // isn't landing. Also checks for Stripe's success_url redirect
  // (?checkout=success&session_id=...) to close funnel step 4 — Tier 1's
  // success_url lands on /compare/pricing, Tier 2's on /checkout (see
  // app/api/checkout/session/route.ts), so both paths are checked rather
  // than just the one Tier 1 originally used.
  useEffect(() => {
    if (!pathname || !booted.current) return;
    if (lastPath.current === pathname) return;

    lastPath.current = pathname;
    pageview(pathname);

    if (pathname.startsWith('/compare/pricing')) {
      track(EVENTS.pricingView, { path: pathname });
    }

    if (pathname.startsWith('/compare/pricing') || pathname.startsWith('/checkout')) {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (params.get('checkout') === 'success' && sessionId) {
        trackCheckoutComplete(sessionId);
      }
    }
  }, [pathname]);

  function decide(next: Exclude<ConsentState, 'unset'>) {
    setConsent(next);
    applyConsent(next);
  }

  if (!ANALYTICS_ENABLED) return null;

  return <ConsentBanner consent={consent} onDecide={decide} />;
}
