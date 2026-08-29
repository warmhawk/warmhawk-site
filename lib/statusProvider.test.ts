import { afterEach, describe, expect, it, vi } from 'vitest';
import { STATUS_COMPONENTS, getStatusChecks } from './statusProvider';

const BASE_URL_KEY = 'STATUS_KUMA_BASE_URL';
const SLUG_KEY = 'STATUS_KUMA_SLUG';

function stubFetchSequence(responses: Response[]) {
  const fetchSpy = vi.fn();
  responses.forEach((response) => fetchSpy.mockResolvedValueOnce(response));
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

const CONFIG_RESPONSE = {
  ok: true,
  json: () =>
    Promise.resolve({
      publicGroupList: [
        {
          monitorList: [
            { id: 1, name: 'Marketing site' },
            { id: 2, name: 'Stripe webhook / license issuance' },
          ],
        },
      ],
    }),
} as Response;

describe('getStatusChecks', () => {
  afterEach(() => {
    delete process.env[BASE_URL_KEY];
    delete process.env[SLUG_KEY];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns an honest "unconfigured" state for every component when the Kuma env vars are unset — never a fake pass', async () => {
    delete process.env[BASE_URL_KEY];
    delete process.env[SLUG_KEY];
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const results = await getStatusChecks();

    expect(results).toHaveLength(STATUS_COMPONENTS.length);
    for (const result of results) {
      expect(result.status).toBe('unconfigured');
      expect(result.status).not.toBe('pass');
      expect(result.detail.toLowerCase()).toContain('not yet configured');
    }
    // No network call should be attempted at all when unconfigured.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns "unconfigured" when only one of the two required env vars is set (multi-condition gate)', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    delete process.env[SLUG_KEY];
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const results = await getStatusChecks();
    for (const result of results) {
      expect(result.status).toBe('unconfigured');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('degrades to "pending" (not "pass" and not a throw) when Kuma is configured but unreachable', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    const results = await getStatusChecks();

    expect(results).toHaveLength(STATUS_COMPONENTS.length);
    for (const result of results) {
      expect(result.status).toBe('pending');
      expect(result.status).not.toBe('pass');
    }
  });

  it('degrades to "pending" when Kuma returns an unexpected response shape', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    stubFetchSequence([
      { ok: true, json: () => Promise.resolve({ unexpected: true }) } as Response,
      { ok: true, json: () => Promise.resolve({ unexpected: true }) } as Response,
    ]);

    const results = await getStatusChecks();
    for (const result of results) {
      expect(result.status).toBe('pending');
    }
  });

  it('reports "pending" for a component with no matching Kuma monitor name, rather than guessing', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    stubFetchSequence([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            publicGroupList: [{ monitorList: [{ id: 1, name: 'Some other monitor' }] }],
          }),
      } as Response,
      { ok: true, json: () => Promise.resolve({ heartbeatList: {} }) } as Response,
    ]);

    const results = await getStatusChecks();
    for (const result of results) {
      expect(result.status).toBe('pending');
      expect(result.detail).toContain('No Kuma monitor named');
    }
  });

  it('maps real Kuma heartbeat status codes onto pass/fail/pending, using the latest heartbeat per monitor', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    stubFetchSequence([
      CONFIG_RESPONSE,
      {
        ok: true,
        json: () =>
          Promise.resolve({
            heartbeatList: {
              // Monitor 1 (Marketing site): up.
              '1': [
                { status: 0, time: '2026-08-22T00:00:00Z', msg: 'Timeout', ping: null },
                { status: 1, time: '2026-08-22T00:01:00Z', msg: 'OK', ping: 42 },
              ],
              // Monitor 2 (Stripe webhook): currently down.
              '2': [
                { status: 0, time: '2026-08-22T00:01:00Z', msg: 'Connection refused', ping: null },
              ],
            },
          }),
      } as Response,
    ]);

    const results = await getStatusChecks();
    const marketingSite = results.find((r) => r.key === 'marketing-site');
    const stripeWebhook = results.find((r) => r.key === 'stripe-webhook');

    expect(marketingSite?.status).toBe('pass');
    expect(marketingSite?.detail).toBe('OK');
    expect(stripeWebhook?.status).toBe('fail');
    expect(stripeWebhook?.detail).toBe('Connection refused');
  });

  it('maps Kuma PENDING and MAINTENANCE heartbeat codes onto our "pending" state', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    stubFetchSequence([
      CONFIG_RESPONSE,
      {
        ok: true,
        json: () =>
          Promise.resolve({
            heartbeatList: {
              '1': [{ status: 2, time: '2026-08-22T00:00:00Z', msg: 'Pending', ping: null }],
              '2': [{ status: 3, time: '2026-08-22T00:00:00Z', msg: 'Maintenance', ping: null }],
            },
          }),
      } as Response,
    ]);

    const results = await getStatusChecks();
    for (const result of results) {
      expect(result.status).toBe('pending');
    }
  });

  it('reports "pending" for a matched monitor with no heartbeat data yet', async () => {
    process.env[BASE_URL_KEY] = 'https://uptime.example.com';
    process.env[SLUG_KEY] = 'warmhawk';
    stubFetchSequence([
      CONFIG_RESPONSE,
      { ok: true, json: () => Promise.resolve({ heartbeatList: {} }) } as Response,
    ]);

    const results = await getStatusChecks();
    for (const result of results) {
      expect(result.status).toBe('pending');
      expect(result.detail).toContain('No heartbeat data reported yet');
    }
  });
});
