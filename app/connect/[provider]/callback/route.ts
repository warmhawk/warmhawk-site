import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_CONSENT_STATE, isConnectProvider, verifyTicket } from '@/lib/connect';

/**
 * The WarmHawk Connect OAuth redirect URI (see lib/connect.ts). Google and Microsoft send the
 * buyer's browser here; this bounces it, with the code or the provider's error, to the install
 * named inside the signed ticket. Nothing is exchanged, stored or logged here.
 */

const PASS_THROUGH_PARAMS = ['code', 'scope', 'error', 'error_description', 'error_subcode'];
const MAX_PARAM_LENGTH = 2048;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );
}

/** `heading`/`body` are trusted markup; anything from the query string goes through escapeHtml. */
function page(heading: string, body: string, status: number): NextResponse {
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>WarmHawk Connect</title>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">
<h1 style="font-size:1.25rem">${heading}</h1>${body}</body>`;
  return new NextResponse(html, {
    status,
    headers: { ...NO_STORE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** Only reached when the ticket can't be trusted, so there is nowhere safe to send the buyer. */
function deadEnd(message: string, status: number): NextResponse {
  return page(
    "This connect link didn't work",
    `<p>${message}</p><p>Go back to your WarmHawk dashboard and click <b>Connect</b> again.</p>`,
    status,
  );
}

/** Microsoft's answer to the admin-consent link (../admin-consent/route.ts). The admin who opened
 *  it is usually not the WarmHawk buyer, so this ends here instead of redirecting anywhere. */
function adminConsentResult(query: URLSearchParams): NextResponse {
  if (query.get('admin_consent')?.toLowerCase() === 'true') {
    return page(
      'WarmHawk is approved for your organization',
      '<p>People in your organization can now connect their Microsoft 365 mailboxes to WarmHawk without asking for approval again.</p><p>You can close this tab. Whoever sent you the link can click <b>Connect</b> in WarmHawk now.</p>',
      200,
    );
  }
  const reason = (query.get('error_description') ?? '').split(/(?<=\.)\s/)[0]?.slice(0, 300);
  return page(
    "WarmHawk wasn't approved",
    `<p>Microsoft didn't record the approval${reason ? `: ${escapeHtml(reason)}` : '.'}</p><p>Approving an app for everyone needs a Microsoft 365 Global Administrator, Application Administrator or Cloud Application Administrator. Open the link again signed in as one of them.</p>`,
    400,
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isConnectProvider(provider)) return deadEnd('Unknown sign-in provider.', 404);

  // An admin's approval carries no ticket, so it doesn't need the ticket secret either.
  const query = request.nextUrl.searchParams;
  if (provider === 'microsoft' && query.get('state') === ADMIN_CONSENT_STATE) {
    return adminConsentResult(query);
  }

  const secret = process.env.CONNECT_TICKET_SECRET;
  if (!secret) return deadEnd('WarmHawk Connect is switched off right now.', 503);

  const verified = verifyTicket(query.get('state') ?? '', secret);
  if (!verified.ok) {
    return verified.reason === 'expired'
      ? deadEnd('The sign-in took longer than 10 minutes, so the link expired.', 400)
      : deadEnd('The link was changed or is incomplete.', 400);
  }
  const { ticket } = verified;
  if (ticket.prov !== provider) return deadEnd('The link was changed or is incomplete.', 400);

  const target = new URL(ticket.ret);
  for (const name of PASS_THROUGH_PARAMS) {
    const value = query.get(name);
    if (value) target.searchParams.set(name, value.slice(0, MAX_PARAM_LENGTH));
  }
  // The provider never answered with either: a hand-typed or truncated callback URL.
  if (!query.get('code') && !query.get('error'))
    target.searchParams.set('error', 'invalid_request');
  target.searchParams.set('state', ticket.ist);

  return NextResponse.redirect(target.toString(), { status: 302, headers: NO_STORE_HEADERS });
}
