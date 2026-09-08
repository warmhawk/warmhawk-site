import { NextRequest, NextResponse } from 'next/server';
import { emailSender } from '@/lib/email';
import { createRateLimiter, clientIp } from '@/lib/rateLimit';

/**
 * Failure beacon for warmhawk-enterprise-operator's scripts/install.sh and scripts/update.sh —
 * both scripts funnel every hard failure through a single `fail()` helper (see each script's own
 * comment), which now does a best-effort `curl` here before printing its usual "next step" message
 * and exiting. Deliberately unauthenticated: the two failure modes this exists to catch fastest
 * (registry.warmhawk.com unreachable, DNS not propagated) are exactly the situations where the
 * customer's box may not be able to reach any authenticated warmhawk.com endpoint reliably either
 * — this route only ever emails support@warmhawk.com, so there's nothing sensitive an unauthenticated
 * caller could do with it beyond spamming that inbox, which the rate limiter below bounds.
 *
 * Root incident this was built for: registry.warmhawk.com had zero DNS records for 5 days
 * (2026-09-03 to 2026-09-08), so `docker login` failed on every real customer's first install
 * attempt, silently, with no way for WarmHawk to find out short of a customer emailing in — which a
 * customer who never got the product running in the first place has little reason to do. This
 * route exists so that class of outage surfaces as an email within minutes of the first real
 * customer hitting it, not after a support ticket eventually correlates it days or weeks later.
 *
 * Body: { script: 'install'|'update', event: 'install_failed'|'update_failed', domain?, message }
 */

const MAX_FIELD_LENGTH = 2000;

/** Strips control characters and caps length — this text lands directly in an email body, and the
 *  only thing worse than a truncated error message is one that let a customer's box inject
 *  arbitrary content into an internal inbox. */
function sanitize(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').slice(0, MAX_FIELD_LENGTH);
}

const VALID_EVENTS = new Set(['install_failed', 'update_failed']);
const VALID_SCRIPTS = new Set(['install', 'update']);

/** Generous on purpose, same reasoning as app/api/registry/token/route.ts's own limiter — a real
 *  outage (like the one this route was built to catch) means many customers' scripts retrying in
 *  a short window is the EXPECTED case, not abuse. This only guards against one caller flooding the
 *  inbox, not against a genuine multi-customer outage generating a burst of distinct reports. */
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 10 * 60 * 1000 });

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimiter.check(ip)) {
    // 204, not 429 — this is a fire-and-forget beacon from a customer's shell script (curl -fsS
    // with its result discarded), not a request anything is waiting on. No reason to give a script
    // that already failed once something new to (not) handle.
    return new NextResponse(null, { status: 204 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const script =
    typeof body.script === 'string' && VALID_SCRIPTS.has(body.script) ? body.script : '';
  const event = typeof body.event === 'string' && VALID_EVENTS.has(body.event) ? body.event : '';
  const domain = sanitize(body.domain);
  const message = sanitize(body.message);

  if (!script || !event || !message) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await emailSender.sendInstallFailureEmail({
      script: script as 'install' | 'update',
      domain,
      message,
      reporterIp: ip,
    });
  } catch (error) {
    // sendInstallFailureEmail already catches its own send errors — this is defense-in-depth only.
    console.error('[install-events] unexpected error notifying support', error);
  }

  return new NextResponse(null, { status: 204 });
}
