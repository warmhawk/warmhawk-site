import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

/**
 * Tests app/api/operator-deploy-tooling/route.ts — the unauthenticated endpoint that streams back
 * warmhawk-enterprise-operator's latest-release `deploy-tooling.tar.gz` asset. Stubs global `fetch`
 * (same `vi.stubGlobal('fetch', ...)` technique lib/statusProvider.test.ts already uses for its own
 * outbound-HTTP tests) rather than adding a GitHub SDK/mocking dependency just for this.
 *
 * Each test uses its own `x-real-ip` (via `requestFrom`) so the route's module-scoped rate limiter
 * (lib/rateLimit.ts, shared across every call in this file the same way it's shared across real
 * requests in production) can't let one test's request count bleed into another's.
 */
const ORIGINAL_TOKEN = process.env.OPERATOR_RELEASE_READ_TOKEN;
let testIpCounter = 0;

function requestFrom(ip = `198.51.100.${++testIpCounter}`) {
  return new NextRequest('http://localhost/api/operator-deploy-tooling', {
    headers: { 'x-real-ip': ip },
  });
}

function stubFetchSequence(responses: Response[]) {
  const fetchSpy = vi.fn();
  responses.forEach((response) => fetchSpy.mockResolvedValueOnce(response));
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

describe('GET /api/operator-deploy-tooling', () => {
  afterEach(() => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = ORIGINAL_TOKEN;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 502 without ever calling GitHub when OPERATOR_RELEASE_READ_TOKEN is not configured', async () => {
    delete process.env.OPERATOR_RELEASE_READ_TOKEN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(requestFrom());

    expect(res.status).toBe(502);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('streams back the deploy-tooling.tar.gz asset as application/gzip on the happy path', async () => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = 'test-read-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetchSequence([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            assets: [
              { name: 'source.tar.gz', url: 'https://api.github.com/repos/x/y/releases/assets/1' },
              {
                name: 'deploy-tooling.tar.gz',
                url: 'https://api.github.com/repos/x/y/releases/assets/2',
              },
            ],
          }),
      } as Response,
      new Response('fake deploy tooling tarball bytes', { status: 200 }),
    ]);

    const res = await GET(requestFrom());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/gzip');
    expect(await res.text()).toBe('fake deploy tooling tarball bytes');
  });

  it('returns 502 (not a crash) when no release has been published yet', async () => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = 'test-read-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetchSequence([{ ok: false, status: 404, json: () => Promise.resolve({}) } as Response]);

    const res = await GET(requestFrom());
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toMatch(/no.*release.*published/i);
  });

  it('returns 502 when the latest release has no deploy-tooling.tar.gz asset yet', async () => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = 'test-read-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetchSequence([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            assets: [
              { name: 'source.tar.gz', url: 'https://api.github.com/repos/x/y/releases/assets/1' },
            ],
          }),
      } as Response,
    ]);

    const res = await GET(requestFrom());
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toContain('deploy-tooling.tar.gz');
  });

  it('returns 502 when the asset download itself fails', async () => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = 'test-read-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetchSequence([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            assets: [
              {
                name: 'deploy-tooling.tar.gz',
                url: 'https://api.github.com/repos/x/y/releases/assets/2',
              },
            ],
          }),
      } as Response,
      { ok: false, status: 403, body: null } as unknown as Response,
    ]);

    const res = await GET(requestFrom());
    expect(res.status).toBe(502);
  });

  it('returns 429 once a single source IP exceeds the rate limit, without calling GitHub again', async () => {
    process.env.OPERATOR_RELEASE_READ_TOKEN = 'test-read-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);
    const req = requestFrom(); // fixed IP reused for every call below, unlike the other tests

    for (let i = 0; i < 20; i++) {
      const res = await GET(req);
      expect(res.status).toBe(502); // consuming the limit, not yet exceeding it
    }

    const limited = await GET(req);
    const json = (await limited.json()) as { error?: string };

    expect(limited.status).toBe(429);
    expect(json.error).toMatch(/too many/i);
    expect(fetchSpy).toHaveBeenCalledTimes(20); // the 21st call never reached GitHub
  });
});
