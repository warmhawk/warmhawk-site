import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyLicense, derivePublicKeyPem, type LicensePayload } from '@/lib/license';

/**
 * WarmHawk Connect — the one-click Google/Microsoft mailbox connect relay.
 *
 * A self-hosted install lives on the buyer's own domain, but an OAuth app needs a fixed list of
 * redirect URIs. So every install sends its buyer through ONE WarmHawk-owned OAuth app per
 * provider, and this site is that app's redirect URI: it bounces the code straight back to the
 * install it came from. Design: z-notes/2-design/09-26-26-warmhawk-connect.html.
 *
 * What this site holds and what it never holds:
 *   - It holds the Google client secret, so Google's code exchange and every refresh run here
 *     (`/api/connect/google/token`). Tokens pass through in the response body. Nothing stores or
 *     logs them — this site has no database, and no log line below includes a token or a code.
 *   - Microsoft is a public client with PKCE. The code is useless without the verifier, which
 *     stays inside the install's own encrypted state, so Microsoft tokens never touch this site.
 *
 * Auth is the license token, like `/api/operator/relay-invite`: a valid RSA signature proves the
 * caller holds a license this deployment issued. The license's `boundDomain` (set once, by
 * `/api/license/refresh`) pins where a code may be sent, so a leaked license can't aim the relay
 * at somebody else's server.
 */

export type ConnectProvider = 'google' | 'microsoft';

export const CONNECT_PROVIDERS: readonly ConnectProvider[] = ['google', 'microsoft'];

export function isConnectProvider(value: unknown): value is ConnectProvider {
  return value === 'google' || value === 'microsoft';
}

/** `email` is there so the install can check the signed-in account is the mailbox being
 *  connected. `https://mail.google.com/` is the only Google scope that covers both SMTP and IMAP
 *  XOAUTH2. */
export const GOOGLE_SCOPES = ['openid', 'email', 'https://mail.google.com/'];
export const GOOGLE_MAIL_SCOPE = 'https://mail.google.com/';

/** Graph Mail.Send for sending (Graph keeps our MIME headers; SMTP AUTH is off in most tenants)
 *  and outlook.office.com IMAP for reading replies — one consent, two resources. */
export const MICROSOFT_SCOPES = [
  'offline_access',
  'openid',
  'email',
  'User.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://outlook.office.com/IMAP.AccessAsUser.All',
];

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
/** Work and school accounts only. Personal outlook.com mailboxes use an app password. */
const MICROSOFT_AUTHORIZE_URL =
  'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize';

/** Server-only on purpose. `NEXT_PUBLIC_SITE_URL` is inlined at build time and the Docker build
 *  never sets it, so a stage container would read prod's URL — and the redirect URI must match
 *  the host the buyer's browser is really sent back to. */
export function connectBaseUrl(): string {
  return (process.env.CONNECT_BASE_URL || 'https://warmhawk.com').replace(/\/+$/, '');
}

export function redirectUriFor(provider: ConnectProvider): string {
  return `${connectBaseUrl()}/connect/${provider}/callback`;
}

export interface ConnectClients {
  google: { clientId: string; clientSecret: string } | null;
  microsoft: { clientId: string } | null;
}

/** A provider counts as configured only when everything it needs is set; the ticket secret is
 *  needed by both. Unset values mean "Connect is off" (503), never a crash. */
export function connectClients(): ConnectClients {
  const ticketSecret = process.env.CONNECT_TICKET_SECRET;
  const googleId = process.env.GOOGLE_CONNECT_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CONNECT_CLIENT_SECRET;
  const microsoftId = process.env.MICROSOFT_CONNECT_CLIENT_ID;
  return {
    google:
      ticketSecret && googleId && googleSecret
        ? { clientId: googleId, clientSecret: googleSecret }
        : null,
    microsoft: ticketSecret && microsoftId ? { clientId: microsoftId } : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Ticket: the OAuth `state` this site hands the provider. HS256 JWT signed with
// CONNECT_TICKET_SECRET. It carries the install's own state (`ist`, a JWT signed by the install —
// opaque here) so the callback can hand it back untouched.
// ---------------------------------------------------------------------------------------------

export const TICKET_LIFETIME_SECONDS = 10 * 60;

export interface ConnectTicket {
  v: 1;
  prov: ConnectProvider;
  /** Where the callback sends the code: the install's `/v1/oauth/{provider}/connect-callback`. */
  ret: string;
  /** The install's own state, returned to it as `state`. */
  ist: string;
  /** Stripe customer id, for rate limiting and support; never shown to the buyer. */
  cid: string;
  exp: number;
}

const TICKET_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
  'base64url',
);

function hmac(input: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(input).digest();
}

export function signTicket(ticket: ConnectTicket, secret: string): string {
  const body = `${TICKET_HEADER}.${Buffer.from(JSON.stringify(ticket)).toString('base64url')}`;
  return `${body}.${hmac(body, secret).toString('base64url')}`;
}

export type TicketResult =
  | { ok: true; ticket: ConnectTicket }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyTicket(token: string, secret: string, now = Date.now()): TicketResult {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TICKET_HEADER) return { ok: false, reason: 'malformed' };
  const expected = hmac(`${parts[0]}.${parts[1]}`, secret);
  const given = Buffer.from(parts[2]!, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }
  let ticket: ConnectTicket;
  try {
    ticket = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as ConnectTicket;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (ticket.v !== 1 || !isConnectProvider(ticket.prov) || typeof ticket.ret !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof ticket.exp !== 'number' || ticket.exp * 1000 < now) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, ticket };
}

// ---------------------------------------------------------------------------------------------
// License auth for the two install-facing POST routes.
// ---------------------------------------------------------------------------------------------

export type LicenseAuth =
  | { ok: true; payload: LicensePayload }
  | { ok: false; response: NextResponse };

/** `Authorization: Bearer <license token>`. Strict on expiry, like relay-invite: connecting and
 *  refreshing mailboxes is active use of the product, so it stops once the license lapses (the
 *  license already carries ~a month of grace past the billing period). */
export function authenticateConnectRequest(request: NextRequest): LicenseAuth {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) {
    return { ok: false, response: connectError('license_invalid', 401) };
  }
  const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    console.error(
      'LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot verify a Connect license',
    );
    return { ok: false, response: connectError('provider_not_configured', 503) };
  }
  const result = verifyLicense(token, derivePublicKeyPem(privateKeyPem));
  if (result.valid) return { ok: true, payload: result.payload };
  if (result.expired) return { ok: false, response: connectError('license_expired', 402) };
  return { ok: false, response: connectError('license_invalid', 401) };
}

export function connectError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    { error, ...extra },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * The only return URL an install may ask for: `https://<boundDomain>/v1/oauth/<provider>/connect-callback`.
 * Exact host match — not a suffix match, so `evil.<boundDomain>` and `<boundDomain>.evil.com`
 * both fail. Plain http is allowed only for a localhost-bound license (local development).
 */
export function isAllowedReturnUrl(
  returnUrl: string,
  boundDomain: string,
  provider: ConnectProvider,
): boolean {
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    return false;
  }
  const isLocal = boundDomain === 'localhost' || boundDomain === '127.0.0.1';
  const protocolOk = url.protocol === 'https:' || (isLocal && url.protocol === 'http:');
  return (
    protocolOk &&
    url.hostname === boundDomain.toLowerCase() &&
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === '' &&
    url.pathname === `/v1/oauth/${provider}/connect-callback`
  );
}

export function buildAuthorizeUrl(
  provider: ConnectProvider,
  clientId: string,
  state: string,
  opts: { loginHint?: string; codeChallenge?: string },
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFor(provider),
    response_type: 'code',
    state,
  });
  if (provider === 'google') {
    params.set('scope', GOOGLE_SCOPES.join(' '));
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('include_granted_scopes', 'false');
  } else {
    params.set('scope', MICROSOFT_SCOPES.join(' '));
    params.set('response_mode', 'query');
    params.set('code_challenge', opts.codeChallenge ?? '');
    params.set('code_challenge_method', 'S256');
  }
  if (opts.loginHint) params.set('login_hint', opts.loginHint);
  return `${provider === 'google' ? GOOGLE_AUTHORIZE_URL : MICROSOFT_AUTHORIZE_URL}?${params}`;
}
