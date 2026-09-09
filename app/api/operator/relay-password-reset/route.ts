import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense, derivePublicKeyPem } from '@/lib/license';
import { emailSender } from '@/lib/email';
import { createRateLimiter } from '@/lib/rateLimit';

/**
 * Sends a self-hosted `warmhawk-enterprise-operator` instance's forgot-password email on its
 * behalf. Same relay rationale as `app/api/operator/relay-invite/route.ts` (its module doc has the
 * full history): a self-hosted customer has no SMTP/email-provider account of their own, so
 * `warmhawk-site` relays through the SMTP credential it already has live in production rather than
 * requiring one just for this. Volume is smaller than invites (only fires when someone forgets
 * their password), so this adds negligible load on top of the license-delivery/invite-relay email
 * this same key already sends.
 *
 * THE CREDENTIAL IS THE EXISTING LICENSE TOKEN — same pattern as relay-invite: the operator sends
 * the license token it already holds as plain JSON, not a new secret minted per customer.
 *
 * Lenient-on-expiry is deliberately NOT used here, matching relay-invite's own reasoning —
 * `verifyLicense` rejects an expired token. Unlike an invite (new usage of the product), you could
 * argue a locked-out owner of a LAPSED subscription still deserves to get back into their own
 * dashboard — but this repo's license-refresh/portal routes already handle "reach billing to fix a
 * lapse" via /api/portal without needing dashboard login at all, so there's no real case being cut
 * off here, and consistency with the other relay route (both gated the same way) is worth more than
 * a bespoke exception.
 */

/** Keyed by the license's own customerId, same reasoning as relay-invite's limiter — an operator
 *  instance always calls from the same box, so an IP-based limit would just rate-limit one
 *  customer's own legitimate retries. 10/day comfortably covers real forgot-password usage (this
 *  fires only when someone is actually locked out) while capping abuse of the shared relay key. */
const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 24 * 60 * 60 * 1000 });

interface RelayPasswordResetRequestBody {
  license?: string;
  toEmail?: string;
  resetUrl?: string;
}

export async function POST(request: NextRequest) {
  let body: RelayPasswordResetRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { license, toEmail, resetUrl } = body;
  if (!license || !toEmail || !resetUrl) {
    return NextResponse.json(
      { error: 'license, toEmail and resetUrl are all required.' },
      { status: 400 },
    );
  }

  const licenseSigningPrivateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!licenseSigningPrivateKeyPem) {
    console.error(
      'LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot verify a password-reset-relay license',
    );
    return NextResponse.json(
      { error: 'Password-reset relay is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const licenseResult = verifyLicense(license, derivePublicKeyPem(licenseSigningPrivateKeyPem));
  if (!licenseResult.valid) {
    // 'expired' is ordinary lifecycle behavior (a lapsed subscription) and not alerted on; 'malformed'
    // and 'invalid_signature' should never happen in ordinary use — see
    // sendLicenseVerificationFailureEmail's doc comment (lib/email.ts) for why this is worth paging on.
    if (licenseResult.reason !== 'expired') {
      await emailSender.sendLicenseVerificationFailureEmail({
        route: 'relay-password-reset',
        reason: licenseResult.reason,
      });
    }
    return NextResponse.json(
      { error: 'That license is invalid or expired — cannot relay this password reset.' },
      { status: 401 },
    );
  }

  if (!rateLimiter.check(licenseResult.payload.customerId)) {
    return NextResponse.json(
      { error: 'Too many password-reset-relay requests for this license — try again later.' },
      { status: 429 },
    );
  }

  const result = await emailSender.sendPasswordResetRelayEmail({ toEmail, resetUrl });
  return NextResponse.json(result);
}
