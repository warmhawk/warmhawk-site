// Client-side analytics — GA4 for acquisition, PostHog for the funnel. Both
// are entirely optional: with the NEXT_PUBLIC_* IDs unset (local dev, stage,
// e2e) nothing loads and every call here is a no-op, so this module is safe
// to import from anywhere without a guard. Mirrors sibling product
// Jitterflow's apps/web/src/lib/analytics.ts, adapted to WarmHawk's own
// funnel (no signup flow here — the free tier needs no account, so the
// funnel runs landing -> pricing -> checkout instead).
//
// Consent model (see ConsentBanner.tsx):
//   - before consent  GA4 runs under Consent Mode v2 with analytics_storage
//                     denied (cookieless pings), PostHog runs with
//                     persistence:'memory' and no session recording. Neither
//                     writes a cookie, so traffic is measurable on day one
//                     without a decision from the visitor.
//   - after "Accept"  analytics_storage is granted, PostHog upgrades to
//                     localStorage+cookie and starts session recording.
//   - after "Decline" both stay in the cookieless mode above, permanently.
//
// The /legal/privacy#cookies policy text has to keep describing exactly this.

import type { PostHog } from 'posthog-js';

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export const GA4_ENABLED = GA4_MEASUREMENT_ID !== '';
export const POSTHOG_ENABLED = POSTHOG_KEY !== '';
export const ANALYTICS_ENABLED = GA4_ENABLED || POSTHOG_ENABLED;

// --- the funnel --------------------------------------------------------
// Four events, in order. Each one narrows where the loss is; a drop between
// any adjacent pair points at a different fix. Names are snake_case because
// GA4 rejects anything else, and are shared verbatim with PostHog so a
// funnel defined in one tool reads the same in the other.
export const EVENTS = {
  landingView: 'landing_view',
  pricingView: 'pricing_view',
  checkoutStart: 'checkout_start',
  checkoutComplete: 'checkout_complete',
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];
export type EventProps = Record<string, string | number | boolean | null | undefined>;

// --- consent -------------------------------------------------------------

export type ConsentState = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'wh_analytics_consent';

export function readConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unset';
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : 'unset';
  } catch {
    // Safari in private mode / storage blocked entirely — treat as undecided
    // rather than crashing the banner on first paint.
    return 'unset';
  }
}

export function writeConsent(state: Exclude<ConsentState, 'unset'>): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Non-fatal: the banner still hides for this page view, it just
    // reappears on the next one. Better than blocking the click.
  }
}

// --- bot / automated-traffic exclusion ------------------------------------
// This repo's own Playwright suites (test:e2e, test:human) drive real page
// loads against a running dev/stage server. Without this, the first
// "visitors" in the dashboard would be our own test runs.
// navigator.webdriver is set by every automation driver (Playwright,
// Puppeteer, Selenium) and is the one signal trustworthy before any event is
// sent; the UA check catches headless runs outside a driver.
export function isAutomatedClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.webdriver) return true;
  return /HeadlessChrome|Playwright|puppeteer|Lighthouse|bot|crawler|spider/i.test(
    navigator.userAgent,
  );
}

// --- dispatch --------------------------------------------------------------

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    posthog?: PostHog;
  }
}

/**
 * Send one funnel event to every configured destination.
 *
 * Silent and side-effect-free when analytics is unconfigured or the client
 * is automated, so callers never need to branch. Never throws — a broken
 * beacon must not take checkout down with it.
 */
export function track(event: AnalyticsEvent, props: EventProps = {}): void {
  if (typeof window === 'undefined' || !ANALYTICS_ENABLED || isAutomatedClient()) return;

  try {
    window.gtag?.('event', event, props);
  } catch {
    /* ignore */
  }
  try {
    window.posthog?.capture(event, props);
  } catch {
    /* ignore */
  }
}

/**
 * Record a virtual page view on every client-side route change.
 * Next.js's own App Router navigation doesn't fire either SDK's automatic
 * pageview past the first load, so Analytics.tsx calls this from a pathname
 * effect instead.
 */
export function pageview(path: string): void {
  if (typeof window === 'undefined' || !ANALYTICS_ENABLED || isAutomatedClient()) return;

  try {
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  } catch {
    /* ignore */
  }
  try {
    window.posthog?.capture('$pageview', { $current_url: window.location.href });
  } catch {
    /* ignore */
  }
}

// --- checkout completion (funnel step 4) ------------------------------------
// Stripe redirects back to /compare/pricing?checkout=success&session_id=...
// (see app/api/checkout/session/route.ts's success_url). That query string
// survives a page refresh, so the completion event is guarded by session id
// to fire exactly once per checkout rather than once per visit to that URL.

const CHECKOUT_TRACKED_PREFIX = 'wh_checkout_tracked:';

export function trackCheckoutComplete(sessionId: string): void {
  if (typeof window === 'undefined' || !ANALYTICS_ENABLED || isAutomatedClient()) return;

  const key = `${CHECKOUT_TRACKED_PREFIX}${sessionId}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: fire anyway. An occasional duplicate is a smaller lie
    // than a missing conversion.
  }

  track(EVENTS.checkoutComplete);
}

// --- attribution -------------------------------------------------------------
// GA4 reads utm_* itself; PostHog reads them on $pageview. This is for the
// events sent by hand, so "which channel produced this checkout" is
// answerable without joining two tools. Captured once on first load — a
// client-side route change drops the query string, and the landing referrer
// is the one that matters.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export function landingAttribution(): EventProps {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const attribution: EventProps = {
    referrer: document.referrer || '(direct)',
    landing_path: window.location.pathname,
  };
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) attribution[key] = value;
  }

  return attribution;
}
