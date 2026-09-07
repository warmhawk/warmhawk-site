import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/domain-watch/unsubscribe', {
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

describe('POST /api/domain-watch/unsubscribe', () => {
  beforeEach(() => {
    vi.stubEnv('PROBE_INTERNAL_URL', 'http://probe.internal:4700');
    vi.stubEnv('PROBE_SHARED_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects a missing token before calling the probe', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({}));
    expect(res.status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards the token and passes the probe status straight through', async () => {
    const fetchSpy = vi.fn(() => okJson({ status: 'unsubscribed' }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await POST(postRequest({ token: 'real-token' }));
    const json = (await res.json()) as { status?: string };

    expect(json.status).toBe('unsubscribed');
    const [url] = fetchSpy.mock.calls[0] as unknown as [string];
    expect(url).toBe('http://probe.internal:4700/watch/unsubscribe');
  });

  it('collapses a probe failure into invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    );

    const res = await POST(postRequest({ token: 't' }));
    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe('invalid');
  });
});
