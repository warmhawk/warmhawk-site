import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Mirrors app/api/domain-check/route.ts's own (unwritten) contract by example: same probe, same
 * nonce-then-forward shape. No existing route.test.ts for domain-check to model exactly, so this
 * follows the repo's general route-test convention (see app/api/contact-sales/route.test.ts) —
 * `global.fetch` mocked directly, since the dependency here is the probe's HTTP API, not an
 * internal module.
 */

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/domain-watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function okJson(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const VALID_BODY = { email: 'ops@acme-outreach.com', domains: 'acme-outreach.com' };

describe('POST /api/domain-watch', () => {
  beforeEach(() => {
    vi.stubEnv('PROBE_INTERNAL_URL', 'http://probe.internal:4700');
    vi.stubEnv('PROBE_SHARED_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 503 without calling the probe when unconfigured', async () => {
    vi.unstubAllEnvs();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest(VALID_BODY));

    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a non-string email or domains list', async () => {
    const res = await POST(postRequest({ email: 123, domains: 'a.com' }));
    expect(res.status).toBe(422);
  });

  it('rejects unparsable JSON', async () => {
    const req = new NextRequest('http://localhost/api/domain-watch', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 502 when the nonce fetch fails, without ever calling /watch', async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (String(url).endsWith('/nonce')) return okJson({}, 500);
      throw new Error('should not reach /watch without a nonce');
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest(VALID_BODY));

    expect(res.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches a nonce, then forwards email/domains/turnstileToken to the probe', async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (String(url).endsWith('/nonce')) return okJson({ nonce: 'n-1' });
      return okJson({ status: 'pending' });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({ ...VALID_BODY, turnstileToken: 'tok' }));
    const json = (await res.json()) as { status?: string };

    expect(res.status).toBe(200);
    expect(json.status).toBe('pending');

    const watchCall = fetchSpy.mock.calls.find(([url]) => String(url).endsWith('/watch'));
    expect(watchCall).toBeTruthy();
    const [url, init] = watchCall as unknown as [string, RequestInit];
    expect(url).toBe('http://probe.internal:4700/watch');
    expect((init.headers as Record<string, string>)['x-probe-secret']).toBe('test-secret');
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody).toMatchObject({
      email: 'ops@acme-outreach.com',
      domains: 'acme-outreach.com',
      nonce: 'n-1',
      turnstileToken: 'tok',
    });
  });

  it('omits turnstileToken entirely when none was supplied', async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (String(url).endsWith('/nonce')) return okJson({ nonce: 'n-1' });
      return okJson({ status: 'pending' });
    });
    vi.stubGlobal('fetch', fetchSpy);

    await POST(postRequest(VALID_BODY));

    const watchCall = fetchSpy.mock.calls.find(([url]) => String(url).endsWith('/watch'));
    const [, init] = watchCall as unknown as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty('turnstileToken');
  });

  it('passes a 429 from the probe straight through as rate-limited', async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (String(url).endsWith('/nonce')) return okJson({ nonce: 'n-1' });
      return okJson({ error: 'rate-limited' }, 429);
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it('passes a 403 from the probe straight through as challenge-failed', async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (String(url).endsWith('/nonce')) return okJson({ nonce: 'n-1' });
      return okJson({ error: 'turnstile' }, 403);
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it('collapses an unreachable probe into the generic unavailable message, never a stack trace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );

    const res = await POST(postRequest(VALID_BODY));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toBe('unavailable');
  });
});
