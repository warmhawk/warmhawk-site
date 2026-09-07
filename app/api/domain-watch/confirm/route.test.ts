import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/domain-watch/confirm', {
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

describe('POST /api/domain-watch/confirm', () => {
  beforeEach(() => {
    vi.stubEnv('PROBE_INTERNAL_URL', 'http://probe.internal:4700');
    vi.stubEnv('PROBE_SHARED_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns invalid without calling the probe when unconfigured', async () => {
    vi.unstubAllEnvs();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({ token: 't' }));
    const json = (await res.json()) as { status?: string };

    expect(json.status).toBe('invalid');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing or non-string token before ever calling the probe', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({}));
    expect(res.status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards the token to the probe and passes its status straight through', async () => {
    const fetchSpy = vi.fn(() => okJson({ status: 'confirmed' }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({ token: 'real-token' }));
    const json = (await res.json()) as { status?: string };

    expect(json.status).toBe('confirmed');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://probe.internal:4700/watch/confirm');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'real-token' });
  });

  it('collapses a probe failure into invalid rather than surfacing an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    );

    const res = await POST(postRequest({ token: 't' }));
    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe('invalid');
  });
});
