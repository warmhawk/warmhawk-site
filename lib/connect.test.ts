import { describe, it, expect, afterEach } from 'vitest';
import {
  buildAuthorizeUrl,
  isAllowedReturnUrl,
  redirectUriFor,
  signTicket,
  verifyTicket,
  type ConnectTicket,
} from './connect';

const SECRET = 'test-connect-ticket-secret-0123456789abcdef';
const ORIGINAL_BASE_URL = process.env.CONNECT_BASE_URL;

function ticket(overrides: Partial<ConnectTicket> = {}): ConnectTicket {
  return {
    v: 1,
    prov: 'google',
    ret: 'https://warmhawk.acme.example/v1/oauth/google/connect-callback',
    ist: 'install-state-jwt',
    cid: 'cus_test_123',
    exp: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  };
}

afterEach(() => {
  process.env.CONNECT_BASE_URL = ORIGINAL_BASE_URL;
});

describe('connect tickets', () => {
  it('round-trips a signed ticket', () => {
    const original = ticket();
    expect(verifyTicket(signTicket(original, SECRET), SECRET)).toEqual({
      ok: true,
      ticket: original,
    });
  });

  it('rejects a ticket signed with another secret', () => {
    expect(verifyTicket(signTicket(ticket(), 'other-secret'), SECRET)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a ticket whose return URL was swapped after signing', () => {
    const [header, , signature] = signTicket(ticket(), SECRET).split('.');
    const swapped = Buffer.from(
      JSON.stringify(
        ticket({ ret: 'https://attacker.example.net/v1/oauth/google/connect-callback' }),
      ),
    ).toString('base64url');
    expect(verifyTicket(`${header}.${swapped}.${signature}`, SECRET)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects an expired ticket', () => {
    const expired = signTicket(ticket({ exp: Math.floor(Date.now() / 1000) - 1 }), SECRET);
    expect(verifyTicket(expired, SECRET)).toEqual({ ok: false, reason: 'expired' });
  });

  it.each(['', 'a.b', 'a.b.c', 'not-a-ticket'])('rejects malformed input %j', (input) => {
    expect(verifyTicket(input, SECRET).ok).toBe(false);
  });
});

describe('isAllowedReturnUrl', () => {
  const bound = 'warmhawk.acme.example';

  it('accepts exactly the install connect-callback on the bound domain', () => {
    expect(
      isAllowedReturnUrl(
        'https://warmhawk.acme.example/v1/oauth/google/connect-callback',
        bound,
        'google',
      ),
    ).toBe(true);
  });

  it.each([
    'https://evil.warmhawk.acme.example/v1/oauth/google/connect-callback',
    'https://warmhawk.acme.example.evil.net/v1/oauth/google/connect-callback',
    'http://warmhawk.acme.example/v1/oauth/google/connect-callback',
    'https://warmhawk.acme.example/v1/oauth/microsoft/connect-callback',
    'https://warmhawk.acme.example/v1/oauth/google/callback',
    'https://warmhawk.acme.example/v1/oauth/google/connect-callback?next=https://evil.net',
    'https://user:pw@warmhawk.acme.example/v1/oauth/google/connect-callback',
    'javascript:alert(1)',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isAllowedReturnUrl(url, bound, 'google')).toBe(false);
  });

  it('allows plain http only for a localhost-bound license', () => {
    expect(
      isAllowedReturnUrl(
        'http://localhost:4799/v1/oauth/google/connect-callback',
        'localhost',
        'google',
      ),
    ).toBe(true);
  });
});

describe('buildAuthorizeUrl', () => {
  it('asks Google for offline Gmail access on the relay redirect URI', () => {
    process.env.CONNECT_BASE_URL = 'https://stage.warmhawk.com/';
    const url = new URL(
      buildAuthorizeUrl('google', 'cid.apps.googleusercontent.com', 'TICKET', {
        loginHint: 'sales@acme.example',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://stage.warmhawk.com/connect/google/callback',
    );
    expect(url.searchParams.get('scope')).toBe('openid email https://mail.google.com/');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('login_hint')).toBe('sales@acme.example');
    expect(url.searchParams.get('state')).toBe('TICKET');
  });

  it('sends Microsoft to /organizations with PKCE and both resources', () => {
    const url = new URL(
      buildAuthorizeUrl('microsoft', 'ms-client-id', 'TICKET', { codeChallenge: 'c'.repeat(43) }),
    );
    expect(url.pathname).toBe('/organizations/oauth2/v2.0/authorize');
    expect(url.searchParams.get('code_challenge')).toBe('c'.repeat(43));
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toContain('https://graph.microsoft.com/Mail.Send');
    expect(url.searchParams.get('scope')).toContain(
      'https://outlook.office.com/IMAP.AccessAsUser.All',
    );
    expect(url.searchParams.has('client_secret')).toBe(false);
  });

  it('defaults the redirect URI to production', () => {
    delete process.env.CONNECT_BASE_URL;
    expect(redirectUriFor('google')).toBe('https://warmhawk.com/connect/google/callback');
  });
});
