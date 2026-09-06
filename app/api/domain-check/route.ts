/**
 * Server-side proxy to the probe service.
 *
 * 🔴 The reason this route exists at all: the previous implementation had the BROWSER fetch
 * `NEXT_PUBLIC_CORE_ENGINE_PUBLIC_API_URL` directly. That approach cannot work and never did —
 *
 *   1. `NEXT_PUBLIC_*` is inlined at BUILD time, so the value is baked into the JS bundle and
 *      shipped to every visitor. A shared secret cannot live there.
 *   2. It made the browser talk cross-origin to an API that sets no CORS headers for us.
 *   3. It pointed at `api.warmhawk.com`, which is where a *customer's* self-hosted engine lives.
 *      No WarmHawk-operated instance was ever at that name, which is why the tool has never
 *      returned a result in production.
 *
 * The probe has no public hostname and no ingress route. It is reachable only by container name
 * on the private Docker network, from this process. That is the whole security model: there is no
 * public attack surface to rate-limit, because there is no public address.
 *
 * Every env var read here is server-only. If any of them ever gains a `NEXT_PUBLIC_` prefix, the
 * shared secret is published to every visitor.
 */
import { NextResponse } from 'next/server';
import { normalise, RAW_INPUT_MAX_CHARS } from '@/lib/domainInput';

/** Never statically rendered or cached — every request runs. */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_DOMAINS_PER_BATCH = 15;

/** The visitor never sees which of these went wrong — that detail is ours, not theirs. */
const UNAVAILABLE = {
  error: 'unavailable',
  message:
    "The domain checker isn't reachable right now. Please try again shortly, or reach us at security@warmhawk.com if this keeps happening.",
} as const;

interface ProbeConfig {
  baseUrl: string;
  secret: string;
}

function probeConfig(): ProbeConfig | null {
  const baseUrl = process.env.PROBE_INTERNAL_URL?.trim();
  const secret = process.env.PROBE_SHARED_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ''), secret };
}

/**
 * The probe issues single-use, expiring nonces from a `no-store` endpoint.
 *
 * Fetching it server-side per request is deliberate: a nonce embedded in the cached HTML of
 * `/tools/domain-check` would be the SAME nonce for every visitor the CDN served, so the first
 * person to submit would consume it and everyone else would get a 403.
 */
async function fetchNonce(config: ProbeConfig, signal: AbortSignal): Promise<string | null> {
  const res = await fetch(`${config.baseUrl}/nonce`, {
    headers: { 'x-probe-secret': config.secret, accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return null;
  const body: unknown = await res.json();
  const nonce = (body as { nonce?: unknown }).nonce;
  return typeof nonce === 'string' ? nonce : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = probeConfig();
  if (!config) {
    // Misconfiguration, not visitor error. Logged for us; generic for them.
    console.error('domain-check: PROBE_INTERNAL_URL or PROBE_SHARED_SECRET is not set');
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const domains = (body as { domains?: unknown }).domains;
  const dkimSelector = (body as { dkimSelector?: unknown }).dkimSelector;

  // Passed straight through, unexamined. This proxy deliberately does NOT verify it: the private
  // Docker network is not a trust boundary, so a `turnstileOk: true` asserted here would be a claim
  // the probe has no way to check. The probe holds the secret and calls siteverify itself.
  const turnstileToken = (body as { turnstileToken?: unknown }).turnstileToken;

  if (typeof domains !== 'string' || domains.length > RAW_INPUT_MAX_CHARS) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 422 });
  }

  // Validated here as well as in the probe. This is the fast-feedback copy; the probe validates
  // again because it cannot trust us. Two boundaries, two checks — see lib/domainInput.ts.
  const normalised = normalise(domains, MAX_DOMAINS_PER_BATCH);
  if (normalised.domains.length === 0) {
    return NextResponse.json(
      {
        error: 'no-valid-domains',
        rejected: normalised.rejected,
        truncated: normalised.truncated,
        overCap: normalised.overCap,
      },
      { status: 422 },
    );
  }

  // One deadline covers the nonce fetch and the check together, so a slow probe cannot hold a
  // Next.js server thread open indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const nonce = await fetchNonce(config, controller.signal);
    if (!nonce) return NextResponse.json(UNAVAILABLE, { status: 502 });

    const res = await fetch(`${config.baseUrl}/domain-check`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-probe-secret': config.secret,
        accept: 'application/json',
      },
      body: JSON.stringify({
        // Send the NORMALISED list, not the raw paste. The probe re-validates regardless, but
        // there is no reason to forward attacker-controlled bytes it will only reject.
        domains: normalised.domains.join('\n'),
        nonce,
        ...(typeof turnstileToken === 'string' && turnstileToken ? { turnstileToken } : {}),
        ...(typeof dkimSelector === 'string' && dkimSelector ? { dkimSelector } : {}),
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      // A 429 from the probe is a real answer to the visitor, not an outage — pass it through so
      // the UI can say "you've run a lot of checks" rather than "we're broken".
      if (res.status === 429) {
        return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
      }
      // A rejected Turnstile token is also a real answer, and one the visitor can act on by
      // completing the widget again. Collapsing it into "we're broken" would tell them to wait for
      // a fix that is never coming. A 403 for a stale NONCE is indistinguishable from here, and
      // resolves the same way: reload and retry.
      if (res.status === 403) {
        return NextResponse.json({ error: 'challenge-failed' }, { status: 403 });
      }
      return NextResponse.json(UNAVAILABLE, { status: 502 });
    }

    // Merge the site-side rejections into the probe's meta. The probe only ever saw the domains
    // that survived validation here, so it cannot report what this layer turned away.
    const merged = payload as { meta?: Record<string, unknown> };
    if (merged.meta) {
      merged.meta.rejected = normalised.rejected;
      merged.meta.truncated = normalised.truncated;
      merged.meta.overCap = normalised.overCap;
    }

    return NextResponse.json(merged, { status: 200 });
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
