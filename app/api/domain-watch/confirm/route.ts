/**
 * Server-side proxy to the probe's `/watch/confirm` endpoint. No nonce/Turnstile here — the token
 * itself (long, single-use, HMAC-signed by the probe) is the whole credential; see
 * `packages/guard/src/confirmToken.ts` in warmhawk-probe.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function probeConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.PROBE_INTERNAL_URL?.trim();
  const secret = process.env.PROBE_SHARED_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ''), secret };
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = probeConfig();
  if (!config) {
    console.error('domain-watch/confirm: PROBE_INTERNAL_URL or PROBE_SHARED_SECRET is not set');
    return NextResponse.json({ status: 'invalid' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 400 });
  }

  const token = (body as { token?: unknown }).token;
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ status: 'invalid' }, { status: 422 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${config.baseUrl}/watch/confirm`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-probe-secret': config.secret,
        accept: 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload: unknown = await res.json().catch(() => null);
    return NextResponse.json(payload ?? { status: 'invalid' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
