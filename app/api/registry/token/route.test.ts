import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { issueLicense, type LicensePayload } from '@/lib/license';
import { verifyRegistryToken } from '@/lib/registryToken';
import { TEST_PRIVATE_KEY as LICENSE_TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * Tests app/api/registry/token/route.ts — the Docker Registry v2 Token Authentication `auth.token.
 * realm` a customer's `docker pull` hits for the registry pull-through proxy. Uses real crypto
 * throughout (no `@/lib/license` or `@/lib/registryToken` mocking), same convention as
 * app/api/license/refresh/route.test.ts and app/api/portal/route.test.ts — the property under test
 * IS the crypto: a genuinely valid license must produce a genuinely verifiable registry token, and
 * an invalid/expired one must not.
 *
 * REGISTRY_TOKEN_SIGNING_PRIVATE_KEY gets its own throwaway keypair (generated fresh here, not the
 * checked-in tests/fixtures/license-keypair.ts) — same reasoning as lib/registryToken.test.ts's own
 * header comment: this module's whole point is independence from the license keypair.
 *
 * `@/lib/stripe` IS mocked here (unlike the crypto above) — same `subscriptions.list` shape as
 * app/api/license/refresh/route.test.ts — defaulted to an entitling subscription so every
 * pre-existing test below keeps exercising the real lib/stripeEntitlement.ts check rather than
 * silently relying on its fail-open path. Each test also sends a distinct `x-real-ip` (via
 * `tokenRequest`) so the route's module-scoped rate limiter can't let one test's request count
 * bleed into another's.
 */
const DAY = 60 * 60 * 24;
let testIpCounter = 0;

const subscriptionsListMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({ subscriptions: { list: subscriptionsListMock } }),
}));

let REGISTRY_TEST_PRIVATE_KEY: string;
let REGISTRY_TEST_PUBLIC_KEY: string;

beforeAll(() => {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  REGISTRY_TEST_PRIVATE_KEY = keyPair.privateKey;
  REGISTRY_TEST_PUBLIC_KEY = keyPair.publicKey;
});

function licenseToken(overrides: Partial<LicensePayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return issueLicense(
    {
      licenseKey: 'whk_live_registrytest',
      customerId: 'cus_test_123',
      tier: 'tier_1',
      issuedAt: now,
      expiresAt: now + 30 * DAY,
      ...overrides,
    },
    LICENSE_TEST_PRIVATE_KEY,
  ).token;
}

function basicAuthHeader(password: string, username = 'license'): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function tokenRequest(
  options: {
    service?: string;
    scope?: string;
    authorization?: string;
    ip?: string;
  } = {},
) {
  const url = new URL('http://localhost/api/registry/token');
  if (options.service !== undefined) url.searchParams.set('service', options.service);
  if (options.scope !== undefined) url.searchParams.set('scope', options.scope);
  const headers: Record<string, string> = {
    'x-real-ip': options.ip ?? `203.0.113.${++testIpCounter}`,
  };
  if (options.authorization !== undefined) headers.authorization = options.authorization;
  return new NextRequest(url, { headers });
}

const ORIGINAL_LICENSE_KEY = process.env.LICENSE_SIGNING_PRIVATE_KEY;
const ORIGINAL_REGISTRY_KEY = process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY;

describe('GET /api/registry/token', () => {
  beforeEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = LICENSE_TEST_PRIVATE_KEY;
    process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY = REGISTRY_TEST_PRIVATE_KEY;
    subscriptionsListMock.mockReset();
    subscriptionsListMock.mockResolvedValue({ data: [{ id: 'sub_test', status: 'active' }] });
  });

  afterEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = ORIGINAL_LICENSE_KEY;
    process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY = ORIGINAL_REGISTRY_KEY;
    vi.restoreAllMocks();
  });

  it('returns 200 with a token that verifies, for a currently-valid license', async () => {
    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        scope: 'repository:warmhawk/enterprise-operator:pull',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    const json = (await res.json()) as { token?: string; access_token?: string };

    expect(res.status).toBe(200);
    expect(json.token).toBeTruthy();
    expect(json.access_token).toBe(json.token);

    const verified = verifyRegistryToken(json.token!, REGISTRY_TEST_PUBLIC_KEY);
    expect(verified.valid).toBe(true);
    if (verified.valid) {
      expect(verified.payload.aud).toBe('registry.warmhawk.com');
      expect(verified.payload.sub).toBe('whk_live_registrytest');
      expect(verified.payload.access).toEqual([
        { type: 'repository', name: 'warmhawk/enterprise-operator', actions: ['pull'] },
      ]);
    }
  });

  it('grants the fixed access even when no scope is requested at all', async () => {
    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('ignores the username in Basic auth — only the password (license token) matters', async () => {
    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken(), 'anything-at-all'),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('returns 401 when the Authorization header is missing entirely', async () => {
    const res = await GET(tokenRequest({ service: 'registry.warmhawk.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for a non-Basic Authorization scheme', async () => {
    const res = await GET(
      tokenRequest({ service: 'registry.warmhawk.com', authorization: `Bearer ${licenseToken()}` }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired license — no lenient "still authenticates when expired" behavior here', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = licenseToken({ issuedAt: now - 60 * DAY, expiresAt: now - DAY });
    const res = await GET(
      tokenRequest({ service: 'registry.warmhawk.com', authorization: basicAuthHeader(expired) }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for a license signed with a different key — no forging a registry pull', async () => {
    const attackerKey = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }).privateKey;
    const forged = issueLicense(
      {
        licenseKey: 'whk_live_forged',
        customerId: 'cus_someone_elses',
        tier: 'tier_2',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + DAY,
      },
      attackerKey,
    ).token;

    const res = await GET(
      tokenRequest({ service: 'registry.warmhawk.com', authorization: basicAuthHeader(forged) }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 503 without minting a token when LICENSE_SIGNING_PRIVATE_KEY is not configured', async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    expect(res.status).toBe(503);
  });

  it('returns 503 when REGISTRY_TOKEN_SIGNING_PRIVATE_KEY is not configured, even with a valid license', async () => {
    delete process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    expect(res.status).toBe(503);
  });

  it('warns but still grants the fixed access when the requested scope differs from what is ever granted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        scope: 'repository:some/other-image:pull,push',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    const json = (await res.json()) as { token: string };

    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();

    const verified = verifyRegistryToken(json.token, REGISTRY_TEST_PUBLIC_KEY);
    expect(verified.valid).toBe(true);
    if (verified.valid) {
      expect(verified.payload.access).toEqual([
        { type: 'repository', name: 'warmhawk/enterprise-operator', actions: ['pull'] },
      ]);
    }
  });

  it('returns 401 and mints no token when the customer has no entitling Stripe subscription', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [{ id: 'sub_test', status: 'canceled' }] });

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    const json = (await res.json()) as { error?: string; token?: string };

    expect(res.status).toBe(401);
    expect(json.token).toBeUndefined();
    expect(subscriptionsListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_123' }),
    );
  });

  it('returns 401 when the customer has no Stripe subscriptions at all', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [] });

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('fails open (still mints a token) when the Stripe entitlement lookup itself errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    subscriptionsListMock.mockRejectedValue(new Error('Stripe is down'));

    const res = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('returns 429 once a single source IP exceeds the rate limit', async () => {
    const ip = '203.0.113.250';

    for (let i = 0; i < 60; i++) {
      const res = await GET(
        tokenRequest({
          service: 'registry.warmhawk.com',
          authorization: basicAuthHeader(licenseToken()),
          ip,
        }),
      );
      expect(res.status).toBe(200);
    }

    const limited = await GET(
      tokenRequest({
        service: 'registry.warmhawk.com',
        authorization: basicAuthHeader(licenseToken()),
        ip,
      }),
    );
    const json = (await limited.json()) as { error?: string };

    expect(limited.status).toBe(429);
    expect(json.error).toMatch(/too many/i);
  });
});
