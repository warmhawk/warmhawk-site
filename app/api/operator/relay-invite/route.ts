import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense, derivePublicKeyPem } from '@/lib/license';
import { emailSender } from '@/lib/email';
import { createRateLimiter } from '@/lib/rateLimit';

/**
 * Sends a self-hosted `warmhawk-enterprise-operator` instance's team-invite email on its behalf.
 *
 * The operator is proprietary/self-hosted and previously required each customer to configure their
 * own SMTP provider (Resend, Postmark, etc.) just to send a dashboard team-invite — real friction,
 * and a real cost, for a feature that has nothing to do with the product's actual outreach-sending
 * (which already runs through each customer's own connected mailbox, entirely separate from this).
 * Decision: `warmhawk-site` relays these instead, reusing the SMTP credential it already has live in
 * production — no customer ever needs their own email-provider account for this. Invite volume is
 * tiny (a handful of sends per customer, mostly at initial team setup), so this adds negligible load
 * on top of the license-delivery/sales-inquiry email this same key already sends.
 *
 * THE CREDENTIAL IS THE EXISTING LICENSE TOKEN -- NO NEW SECRET MINTED PER CUSTOMER, same pattern as
 * `app/api/registry/token/route.ts`. The operator sends the license token it already holds
 * (`WARMHAWK_LICENSE_KEY`) as plain JSON, not Basic auth -- this isn't a Docker registry protocol
 * exchange, just an authenticated POST.
 *
 * Lenient-on-expiry is deliberately NOT used here (unlike `/api/portal`/`/api/license/refresh`) --
 * `verifyLicense` rejects an expired token, matching the registry-token route's reasoning: inviting a
 * new teammate is active new usage of the product, not a customer trying to reach billing to fix a
 * lapse, so it should stop once the subscription itself has lapsed.
 */

/** Keyed by the license's own customerId rather than IP -- an operator instance always calls from
 *  the same box, so an IP-based limit would just rate-limit one customer's own legitimate retries.
 *  20/day is far above real invite volume (a handful of sends per customer, mostly at initial team
 *  setup) and exists only to cap abuse of the shared relay key, not to meter real usage. */
const rateLimiter = createRateLimiter({ maxRequests: 20, windowMs: 24 * 60 * 60 * 1000 });

interface RelayInviteRequestBody {
  license?: string;
  toEmail?: string;
  inviterEmail?: string;
  acceptUrl?: string;
}

export async function POST(request: NextRequest) {
  let body: RelayInviteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { license, toEmail, inviterEmail, acceptUrl } = body;
  if (!license || !toEmail || !inviterEmail || !acceptUrl) {
    return NextResponse.json(
      { error: 'license, toEmail, inviterEmail and acceptUrl are all required.' },
      { status: 400 },
    );
  }

  const licenseSigningPrivateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!licenseSigningPrivateKeyPem) {
    console.error(
      'LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot verify an invite-relay license',
    );
    return NextResponse.json(
      { error: 'Invite relay is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const licenseResult = verifyLicense(license, derivePublicKeyPem(licenseSigningPrivateKeyPem));
  if (!licenseResult.valid) {
    return NextResponse.json(
      { error: 'That license is invalid or expired — cannot relay this invite.' },
      { status: 401 },
    );
  }

  if (!rateLimiter.check(licenseResult.payload.customerId)) {
    return NextResponse.json(
      { error: 'Too many invite-relay requests for this license — try again later.' },
      { status: 429 },
    );
  }

  const result = await emailSender.sendInviteRelayEmail({ toEmail, inviterEmail, acceptUrl });
  return NextResponse.json(result);
}
