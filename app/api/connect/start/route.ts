import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rateLimit';
import {
  TICKET_LIFETIME_SECONDS,
  authenticateConnectRequest,
  buildAuthorizeUrl,
  connectClients,
  connectError,
  isAllowedReturnUrl,
  isConnectProvider,
  signTicket,
} from '@/lib/connect';

/**
 * Starts a WarmHawk Connect flow for a self-hosted install (see lib/connect.ts).
 *
 * The install's core-engine calls this with its license, gets back the provider's authorize URL,
 * and 302s the buyer's browser there. The OAuth `state` is a ticket only this site can sign, so
 * the callback knows where the code may go without any database.
 */

/** Keyed by customer. 60/day covers connecting dozens of mailboxes plus retries; it exists to cap
 *  abuse of the shared OAuth apps, not to meter real use. */
const rateLimiter = createRateLimiter({ maxRequests: 60, windowMs: 24 * 60 * 60 * 1000 });

/** Install state is a JWT the install signs (with an encrypted PKCE verifier for Microsoft). A
 *  few hundred bytes in practice; the cap keeps the provider's `state` URL well under its limit. */
const MAX_INSTALL_STATE_LENGTH = 2048;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const LOGIN_HINT_PATTERN = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,253}$/i;

interface StartRequestBody {
  provider?: unknown;
  returnUrl?: unknown;
  installState?: unknown;
  codeChallenge?: unknown;
  loginHint?: unknown;
}

export async function POST(request: NextRequest) {
  const auth = authenticateConnectRequest(request);
  if (!auth.ok) return auth.response;
  const license = auth.payload;

  let body: StartRequestBody;
  try {
    body = (await request.json()) as StartRequestBody;
  } catch {
    return connectError('invalid_request', 400);
  }
  const { provider, returnUrl, installState, codeChallenge, loginHint } = body;
  if (
    !isConnectProvider(provider) ||
    typeof returnUrl !== 'string' ||
    typeof installState !== 'string' ||
    installState.length === 0 ||
    installState.length > MAX_INSTALL_STATE_LENGTH ||
    (loginHint !== undefined &&
      (typeof loginHint !== 'string' || !LOGIN_HINT_PATTERN.test(loginHint)))
  ) {
    return connectError('invalid_request', 400);
  }
  if (
    provider === 'microsoft' &&
    (typeof codeChallenge !== 'string' || !CODE_CHALLENGE_PATTERN.test(codeChallenge))
  ) {
    return connectError('invalid_request', 400);
  }

  // Trust-on-first-use pin: an unbound license must refresh with its install domain first. The
  // operator does that on its own and retries, so the buyer never sees this.
  if (!license.boundDomain) return connectError('license_unbound', 409);
  if (!isAllowedReturnUrl(returnUrl, license.boundDomain, provider)) {
    return connectError('domain_mismatch', 403, { boundDomain: license.boundDomain });
  }

  const client = connectClients()[provider];
  if (!client) return connectError('provider_not_configured', 503);

  if (!rateLimiter.check(license.customerId)) return connectError('rate_limited', 429);

  const state = signTicket(
    {
      v: 1,
      prov: provider,
      ret: returnUrl,
      ist: installState,
      cid: license.customerId,
      exp: Math.floor(Date.now() / 1000) + TICKET_LIFETIME_SECONDS,
    },
    process.env.CONNECT_TICKET_SECRET!,
  );

  return NextResponse.json(
    {
      authorizeUrl: buildAuthorizeUrl(provider, client.clientId, state, {
        loginHint: loginHint as string | undefined,
        codeChallenge: codeChallenge as string | undefined,
      }),
      clientId: client.clientId,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
