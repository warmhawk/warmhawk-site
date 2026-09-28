import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as start } from './start/route';
import { POST as token } from './google/token/route';
import { GET as config } from './config/route';
import { GET as callback } from '@/app/connect/[provider]/callback/route';
import { GET as adminConsent } from '@/app/connect/[provider]/admin-consent/route';
import { issueLicense, type LicensePayload } from '@/lib/license';
import { signTicket, verifyTicket } from '@/lib/connect';
import { TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * WarmHawk Connect relay routes (lib/connect.ts). Google's token endpoint is mocked through
 * `fetch`; nothing here reaches a real provider.
 */

const ENV_KEYS = [
  'LICENSE_SIGNING_PRIVATE_KEY',
  'CONNECT_BASE_URL',
  'CONNECT_TICKET_SECRET',
  'GOOGLE_CONNECT_CLIENT_ID',
  'GOOGLE_CONNECT_CLIENT_SECRET',
  'MICROSOFT_CONNECT_CLIENT_ID',
] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

const SECRET = 'test-connect-ticket-secret-0123456789abcdef';
const BOUND = 'warmhawk.acme.example';
const RETURN_URL = `https://${BOUND}/v1/oauth/google/connect-callback`;
const DAY = 24 * 60 * 60;

let customerSeq = 0;
function license(overrides: Partial<LicensePayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return issueLicense(
    {
      licenseKey: 'whk_live_connecttest',
      tier: 'tier_1',
      // A fresh customer per test keeps the module-level rate limiters out of each other's way.
      customerId: `cus_connect_${++customerSeq}`,
      issuedAt: now,
      expiresAt: now + 30 * DAY,
      boundDomain: BOUND,
      ...overrides,
    },
    TEST_PRIVATE_KEY,
  ).token;
}

function post(url: string, body: unknown, licenseToken?: string) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(licenseToken ? { Authorization: `Bearer ${licenseToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const startBody = { provider: 'google', returnUrl: RETURN_URL, installState: 'IST' };

beforeEach(() => {
  process.env.LICENSE_SIGNING_PRIVATE_KEY = TEST_PRIVATE_KEY;
  process.env.CONNECT_BASE_URL = 'https://stage.warmhawk.com';
  process.env.CONNECT_TICKET_SECRET = SECRET;
  process.env.GOOGLE_CONNECT_CLIENT_ID = 'gid.apps.googleusercontent.com';
  process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'GOCSPX-test-only';
  process.env.MICROSOFT_CONNECT_CLIENT_ID = 'ms-client-id';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL_ENV[k];
  }
  vi.restoreAllMocks();
});

describe('POST /api/connect/start', () => {
  it('returns a Google authorize URL whose state is a ticket back to the install', async () => {
    const res = await start(post('http://localhost/api/connect/start', startBody, license()));
    const json = (await res.json()) as { authorizeUrl: string; clientId: string };

    expect(res.status).toBe(200);
    expect(json.clientId).toBe('gid.apps.googleusercontent.com');
    const state = new URL(json.authorizeUrl).searchParams.get('state')!;
    const verified = verifyTicket(state, SECRET);
    expect(verified.ok && verified.ticket.ret).toBe(RETURN_URL);
    expect(verified.ok && verified.ticket.ist).toBe('IST');
  });

  it.each([
    ['no license', undefined, 401, 'license_invalid'],
    ['a garbage license', 'nope.nope', 401, 'license_invalid'],
  ])('refuses %s', async (_label, lic, status, error) => {
    const res = await start(post('http://localhost/api/connect/start', startBody, lic));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error });
  });

  it('refuses an expired license with 402', async () => {
    const now = Math.floor(Date.now() / 1000);
    const lic = license({ issuedAt: now - 60 * DAY, expiresAt: now - DAY });
    const res = await start(post('http://localhost/api/connect/start', startBody, lic));
    expect(res.status).toBe(402);
  });

  it('asks an unbound license to refresh first (409 license_unbound)', async () => {
    const res = await start(
      post('http://localhost/api/connect/start', startBody, license({ boundDomain: undefined })),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'license_unbound' });
  });

  it('refuses a return URL on any other domain', async () => {
    const res = await start(
      post(
        'http://localhost/api/connect/start',
        {
          ...startBody,
          returnUrl: 'https://attacker.example.net/v1/oauth/google/connect-callback',
        },
        license(),
      ),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'domain_mismatch', boundDomain: BOUND });
  });

  it('requires a PKCE challenge for Microsoft', async () => {
    const body = {
      provider: 'microsoft',
      returnUrl: `https://${BOUND}/v1/oauth/microsoft/connect-callback`,
      installState: 'IST',
    };
    const lic = license();
    expect((await start(post('http://localhost/api/connect/start', body, lic))).status).toBe(400);
    const ok = await start(
      post('http://localhost/api/connect/start', { ...body, codeChallenge: 'x'.repeat(43) }, lic),
    );
    expect(ok.status).toBe(200);
  });

  it('answers 503 provider_not_configured when the Google secret is unset', async () => {
    delete process.env.GOOGLE_CONNECT_CLIENT_SECRET;
    const res = await start(post('http://localhost/api/connect/start', startBody, license()));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'provider_not_configured' });
  });

  it('rate-limits one customer at 60 starts a day', async () => {
    const lic = license();
    for (let i = 0; i < 60; i++) {
      expect((await start(post('http://localhost/api/connect/start', startBody, lic))).status).toBe(
        200,
      );
    }
    expect((await start(post('http://localhost/api/connect/start', startBody, lic))).status).toBe(
      429,
    );
  });
});

describe('GET /connect/[provider]/callback', () => {
  function ticketFor(provider: 'google' | 'microsoft' = 'google', expOffset = 600) {
    return signTicket(
      {
        v: 1,
        prov: provider,
        ret: RETURN_URL,
        ist: 'IST',
        cid: 'cus_x',
        exp: Math.floor(Date.now() / 1000) + expOffset,
      },
      SECRET,
    );
  }
  const get = (provider: string, query: Record<string, string>) =>
    callback(
      new NextRequest(
        `http://localhost/connect/${provider}/callback?${new URLSearchParams(query)}`,
      ),
      { params: Promise.resolve({ provider }) },
    );

  it('bounces the code to the install with its own state', async () => {
    const res = await get('google', { code: '4/0Abc', scope: 'email', state: ticketFor() });
    const location = new URL(res.headers.get('location')!);

    expect(res.status).toBe(302);
    expect(location.origin + location.pathname).toBe(RETURN_URL);
    expect(location.searchParams.get('code')).toBe('4/0Abc');
    expect(location.searchParams.get('state')).toBe('IST');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it("passes the provider's error through for the install to explain", async () => {
    const res = await get('google', { error: 'access_denied', state: ticketFor() });
    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('error')).toBe('access_denied');
    expect(location.searchParams.has('code')).toBe(false);
  });

  it('never redirects on a forged, expired or cross-provider ticket', async () => {
    for (const [provider, state] of [
      [
        'google',
        signTicket(
          { v: 1, prov: 'google', ret: 'https://evil.net/x', ist: 'I', cid: 'c', exp: 9e9 },
          'wrong',
        ),
      ],
      ['google', ticketFor('google', -1)],
      ['microsoft', ticketFor('google')],
      ['google', ''],
    ] as const) {
      const res = await get(provider, { code: 'c', state });
      expect(res.status).toBe(400);
      expect(res.headers.get('location')).toBeNull();
    }
  });
});

describe('POST /api/connect/google/token', () => {
  function mockGoogle(status: number, body: unknown) {
    return vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  }

  it('exchanges a code with the WarmHawk secret and passes the response through', async () => {
    const fetchMock = mockGoogle(200, {
      access_token: 'ya29.x',
      refresh_token: '1//r',
      expires_in: 3599,
      scope: 'openid https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email',
      id_token: 'id',
    });
    const res = await token(
      post(
        'http://localhost/api/connect/google/token',
        { grant: 'code', code: '4/0Abc' },
        license(),
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ access_token: 'ya29.x', refresh_token: '1//r' });
    const form = fetchMock.mock.calls[0]![1]!.body as URLSearchParams;
    expect(form.get('client_secret')).toBe('GOCSPX-test-only');
    expect(form.get('redirect_uri')).toBe('https://stage.warmhawk.com/connect/google/callback');
  });

  it('refuses and revokes a grant without the Gmail scope (unticked box)', async () => {
    const fetchMock = mockGoogle(200, {
      access_token: 'ya29.x',
      refresh_token: '1//r',
      scope: 'openid https://www.googleapis.com/auth/userinfo.email',
    });
    const res = await token(
      post(
        'http://localhost/api/connect/google/token',
        { grant: 'code', code: '4/0Abc' },
        license(),
      ),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'scope_missing' });
    expect(String(fetchMock.mock.calls[1]![0])).toBe('https://oauth2.googleapis.com/revoke');
  });

  it('refreshes and passes invalid_grant through as 400 so the install asks to reconnect', async () => {
    const fetchMock = mockGoogle(400, { error: 'invalid_grant' });
    const res = await token(
      post(
        'http://localhost/api/connect/google/token',
        { grant: 'refresh', refreshToken: '1//r' },
        license(),
      ),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_grant' });
    expect((fetchMock.mock.calls[0]![1]!.body as URLSearchParams).get('grant_type')).toBe(
      'refresh_token',
    );
  });

  it('answers 502 when Google is unreachable, without logging the token', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed 1//secret'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await token(
      post(
        'http://localhost/api/connect/google/token',
        { grant: 'refresh', refreshToken: '1//secret' },
        license(),
      ),
    );
    expect(res.status).toBe(502);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('1//secret');
  });

  it('refuses a missing license and a bad grant before calling Google', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    expect(
      (
        await token(
          post('http://localhost/api/connect/google/token', {
            grant: 'refresh',
            refreshToken: 'r',
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await token(
          post('http://localhost/api/connect/google/token', { grant: 'password' }, license()),
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/connect/config', () => {
  it('publishes client IDs and never a secret', async () => {
    const res = await config();
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      google: { clientId: 'gid.apps.googleusercontent.com' },
      microsoft: { clientId: 'ms-client-id' },
    });
    expect(text).not.toContain('GOCSPX');
  });

  it('shows null for a provider that is switched off', async () => {
    delete process.env.MICROSOFT_CONNECT_CLIENT_ID;
    expect(await (await config()).json()).toMatchObject({ microsoft: null });
  });
});

describe('GET /connect/microsoft/admin-consent', () => {
  const get = (provider: string) =>
    adminConsent(new NextRequest(`http://localhost/connect/${provider}/admin-consent`), {
      params: Promise.resolve({ provider }),
    });

  it("sends the admin to Microsoft's organization-wide consent for the Connect scopes", async () => {
    const res = await get('microsoft');
    const location = new URL(res.headers.get('location')!);

    expect(res.status).toBe(302);
    expect(location.origin + location.pathname).toBe(
      'https://login.microsoftonline.com/organizations/v2.0/adminconsent',
    );
    expect(location.searchParams.get('client_id')).toBe('ms-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://stage.warmhawk.com/connect/microsoft/callback',
    );
    expect(location.searchParams.get('state')).toBe('admin_consent');
    expect(location.searchParams.get('scope')!.split(' ')).toEqual([
      'offline_access',
      'openid',
      'email',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://outlook.office.com/IMAP.AccessAsUser.All',
    ]);
  });

  it('is Microsoft only, and off while Microsoft Connect is switched off', async () => {
    expect((await get('google')).status).toBe(404);
    delete process.env.MICROSOFT_CONNECT_CLIENT_ID;
    expect((await get('microsoft')).status).toBe(503);
  });

  it("shows the result of Microsoft's admin consent instead of treating it as a ticket", async () => {
    const back = (query: Record<string, string>) =>
      callback(
        new NextRequest(
          `http://localhost/connect/microsoft/callback?${new URLSearchParams(query)}`,
        ),
        { params: Promise.resolve({ provider: 'microsoft' }) },
      );

    const approved = await back({ admin_consent: 'True', tenant: 't-1', state: 'admin_consent' });
    expect(approved.status).toBe(200);
    expect(approved.headers.get('location')).toBeNull();
    expect(await approved.text()).toContain('approved for your organization');

    const refused = await back({
      error: 'access_denied',
      error_description: 'AADSTS65004: <b>declined</b>. Trace ID: x',
      state: 'admin_consent',
    });
    expect(refused.status).toBe(400);
    const html = await refused.text();
    expect(html).toContain('AADSTS65004: &lt;b&gt;declined&lt;/b&gt;.');
    expect(html).not.toContain('Trace ID');

    // No ticket is involved, so an admin's approval still lands even with Connect's secret unset.
    delete process.env.CONNECT_TICKET_SECRET;
    expect(
      (await back({ admin_consent: 'True', tenant: 't-1', state: 'admin_consent' })).status,
    ).toBe(200);
  });
});
