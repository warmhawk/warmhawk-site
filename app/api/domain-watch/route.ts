/**
 * Server-side proxy to the probe's `/watch` endpoint — same shape and security model as
 * `app/api/domain-check/route.ts` (see that file's own header comment for the full rationale: no
 * public hostname on the probe, secret never reaches `NEXT_PUBLIC_*`, a nonce is fetched
 * per-request rather than baked into cached HTML).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    console.error('domain-watch: PROBE_INTERNAL_URL or PROBE_SHARED_SECRET is not set');
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const email = (body as { email?: unknown }).email;
  const domains = (body as { domains?: unknown }).domains;
  // Passed straight through, unexamined — same reasoning as domain-check's proxy: the private
  // Docker network isn't a trust boundary, so the probe verifies this itself.
  const turnstileToken = (body as { turnstileToken?: unknown }).turnstileToken;

  if (typeof email !== 'string' || typeof domains !== 'string') {
    return NextResponse.json({ error: 'invalid-input' }, { status: 422 });
  }

  // One deadline covers the nonce fetch and the submit together — same reasoning as domain-check.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const nonce = await fetchNonce(config, controller.signal);
    if (!nonce) return NextResponse.json(UNAVAILABLE, { status: 502 });

    const res = await fetch(`${config.baseUrl}/watch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-probe-secret': config.secret,
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        domains,
        nonce,
        ...(typeof turnstileToken === 'string' && turnstileToken ? { turnstileToken } : {}),
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      if (res.status === 429) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
      if (res.status === 403)
        return NextResponse.json({ error: 'challenge-failed' }, { status: 403 });
      if (res.status === 422)
        return NextResponse.json(payload ?? { error: 'invalid-input' }, { status: 422 });
      return NextResponse.json(UNAVAILABLE, { status: 502 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
