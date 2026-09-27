import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rateLimit';
import {
  GOOGLE_MAIL_SCOPE,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  authenticateConnectRequest,
  connectClients,
  connectError,
  redirectUriFor,
} from '@/lib/connect';

/**
 * Google code exchange and refresh for WarmHawk Connect mailboxes (see lib/connect.ts). Google
 * web clients need the client secret for both, and the secret never leaves this site.
 *
 * Google's response passes straight through to the install. Nothing here stores or logs it — no
 * log line in this file may include the request or response body.
 */

/** Keyed by customer. Each install refreshes at most twice an hour per mailbox (API + worker
 *  each cache their own access token), so 2,000/hour is ~1,000 mailboxes of headroom. */
const rateLimiter = createRateLimiter({ maxRequests: 2000, windowMs: 60 * 60 * 1000 });

const MAX_GRANT_VALUE_LENGTH = 2048;

interface TokenRequestBody {
  grant?: unknown;
  code?: unknown;
  refreshToken?: unknown;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const auth = authenticateConnectRequest(request);
  if (!auth.ok) return auth.response;
  const license = auth.payload;
  // Codes only ever reach a bound install (start refuses unbound licenses), so an unbound
  // license here has no business exchanging anything.
  if (!license.boundDomain) return connectError('license_unbound', 409);

  let body: TokenRequestBody;
  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return connectError('invalid_request', 400);
  }
  const { grant, code, refreshToken } = body;
  const value = grant === 'code' ? code : grant === 'refresh' ? refreshToken : undefined;
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_GRANT_VALUE_LENGTH) {
    return connectError('invalid_request', 400);
  }

  const client = connectClients().google;
  if (!client) return connectError('provider_not_configured', 503);

  if (!rateLimiter.check(license.customerId)) return connectError('rate_limited', 429);

  const form = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
  });
  if (grant === 'code') {
    form.set('grant_type', 'authorization_code');
    form.set('code', value);
    form.set('redirect_uri', redirectUriFor('google'));
  } else {
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', value);
  }

  let upstream: Response;
  let json: GoogleTokenResponse;
  try {
    upstream = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    json = (await upstream.json()) as GoogleTokenResponse;
  } catch (error) {
    console.error('Connect: Google token endpoint unreachable', (error as Error).name);
    return connectError('relay_upstream_error', 502);
  }

  // Unverified apps show Gmail as an UNTICKED checkbox on the consent screen (proven 09-27-26). A
  // buyer who clicks Continue without ticking it gets a token that can't send or read mail. Catch
  // it here, give the grant back, and tell the install so it can say "tick the Gmail box".
  if (grant === 'code' && upstream.ok && !json.scope?.split(' ').includes(GOOGLE_MAIL_SCOPE)) {
    const grantToRevoke = json.refresh_token ?? json.access_token;
    if (grantToRevoke) {
      await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        body: new URLSearchParams({ token: grantToRevoke }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => undefined);
    }
    return connectError('scope_missing', 400);
  }

  return NextResponse.json(json, {
    status: upstream.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
