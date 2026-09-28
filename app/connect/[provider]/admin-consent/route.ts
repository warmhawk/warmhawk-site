import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_CONSENT_STATE,
  connectClients,
  MICROSOFT_SCOPES,
  redirectUriFor,
} from '@/lib/connect';

/**
 * Microsoft 365 "approve WarmHawk for the whole organization" link. Many tenants don't let users
 * approve apps themselves, so a user's Connect ends on Microsoft's "Need admin approval" screen.
 * The install's dashboard hands the buyer this link to send their admin; it opens Microsoft's
 * admin-consent screen for WarmHawk's Connect app with the same permissions Connect asks for.
 * Microsoft comes back to the usual callback with `state=admin_consent` (see ../callback/route.ts).
 *
 * Only a redirect: no license, secret or buyer data is involved, so it needs no auth.
 */

/** v2 admin consent takes dynamic scopes; Graph's own ones must be fully qualified there. */
const OIDC_SCOPES = new Set(['openid', 'email', 'profile', 'offline_access']);
function adminConsentScopes(): string {
  return MICROSOFT_SCOPES.map((scope) =>
    OIDC_SCOPES.has(scope) || scope.startsWith('https://')
      ? scope
      : `https://graph.microsoft.com/${scope}`,
  ).join(' ');
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (provider !== 'microsoft') return new NextResponse('Not found', { status: 404 });
  const microsoft = connectClients().microsoft;
  if (!microsoft) {
    return new NextResponse('WarmHawk Connect for Microsoft 365 is switched off right now.', {
      status: 503,
    });
  }

  const url = new URL('https://login.microsoftonline.com/organizations/v2.0/adminconsent');
  url.searchParams.set('client_id', microsoft.clientId);
  url.searchParams.set('scope', adminConsentScopes());
  url.searchParams.set('redirect_uri', redirectUriFor('microsoft'));
  url.searchParams.set('state', ADMIN_CONSENT_STATE);
  return NextResponse.redirect(url.toString(), {
    status: 302,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
