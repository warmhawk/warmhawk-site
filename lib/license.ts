import { createSign, createVerify } from 'node:crypto';

/**
 * RSA license-key issuance — the ONE canonical implementation for the whole product.
 *
 * V12 fix: three independent agents each built Stripe-webhook + RSA license-signing logic in
 * parallel (this repo, warmhawk-core-engine, warmhawk-enterprise-operator), and they disagreed —
 * different payload shapes, different signing inputs, a hardcoded single-tier literal that didn't
 * even support Tier 2. Per the spec's Support Model ("the only piece of infrastructure WarmHawk
 * itself operates centrally: the marketing site and the Stripe webhook -> license-issuance path"),
 * THIS repo is the correct, sole owner of the live Stripe webhook and the RSA PRIVATE signing key.
 * `warmhawk-core-engine` (Tier 0, free, BSL, going public at go-live) carries no license gate at
 * all and has no business owning any of this — that code was removed from there.
 * `warmhawk-enterprise-operator` is the sole VERIFIER (public key only, via `LicenseGate`).
 *
 * Canonical wire format (matches what warmhawk-core-engine's/warmhawk-enterprise-operator's
 * license code already used — the one of the three parallel builds that was reconciled once
 * before, and therefore the smallest-total-change choice to standardize on):
 *   token = base64url(JSON.stringify(payload)) + '.' + base64url(RSA-SHA256 signature over the
 *   JSON STRING ITSELF, not a re-encoded form of it).
 */

/** Local mirror of `packages/tier-config`'s `Tier` union, restricted to the two tiers that ever
 *  carry a license (Tier 0 has none). This repo cannot import that TypeScript file directly across
 *  the warmhawk-core-engine repo boundary (Repo Architecture — warmhawk-site has no runtime
 *  dependency on either product repo), so — like `lib/tierConfig.ts`'s marketing-table mirror —
 *  this type must be hand-kept in sync with `packages/tier-config/src/constants.ts`'s `Tier`
 *  union. Not to be confused with `lib/tierConfig.ts`'s `TierId` (`'open-core' | 'self-hosted-pro'
 *  | 'enterprise-dfy'`), which is a separate, marketing-display-only naming scheme. */
export type LicenseTier = 'tier_1' | 'tier_2';

export interface LicensePayload {
  /** Unique license identifier (e.g. `whk_live_...` in production, an obviously-fake shape in
   *  test/dev — see the V12 process lesson about placeholder secrets not imitating a real
   *  credential's format). This is NOT the wire token itself — see module doc. */
  licenseKey: string;
  /** The Stripe customer this license was issued for. */
  customerId: string;
  /** The tier this license grants — read against `packages/tier-config` for feature gating. */
  tier: LicenseTier;
  /** Unix epoch seconds — this license is not valid for use before this time. */
  issuedAt: number;
  /** Unix epoch seconds — this license naturally stops verifying as valid after this time, tied
   *  to the current billing period. `LicenseGate` re-checks this on every periodic revalidation. */
  expiresAt: number;
  /** Optional domain binding — a `--domain` value the license was activated against, checked as a
   *  reuse signal (not an auto-block) per the Guardrails "License piracy signal" item. */
  boundDomain?: string;
}

export interface SignedLicense {
  /** The full token to hand to the customer: `<base64url(payload)>.<base64url(signature)>` */
  token: string;
  payload: LicensePayload;
}

const SIGNATURE_ALGORITHM = 'RSA-SHA256';

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Signs a license payload with the WarmHawk-operated RSA private key (PEM string, from
 *  `LICENSE_SIGNING_PRIVATE_KEY`). Called only from `app/api/stripe/webhook/route.ts` — the
 *  private key never leaves this process. */
export function issueLicense(payload: LicensePayload, privateKeyPem: string): SignedLicense {
  const payloadJson = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadJson);

  const signer = createSign(SIGNATURE_ALGORITHM);
  signer.update(payloadJson);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  const encodedSignature = signature.toString('base64url');

  return { token: `${encodedPayload}.${encodedSignature}`, payload };
}

export type LicenseVerificationResult =
  | { valid: true; payload: LicensePayload; expired: false }
  | { valid: false; expired: true; payload: LicensePayload; reason: 'expired' }
  | { valid: false; expired: false; payload: null; reason: 'invalid_signature' | 'malformed' };

/** Verifies a license token against the WarmHawk public key (PEM string) — used only by this
 *  repo's own tests proving the round trip; production verification happens entirely in
 *  warmhawk-enterprise-operator's `LicenseGate`, which never sees the private key. */
export function verifyLicense(token: string, publicKeyPem: string): LicenseVerificationResult {
  const parts = token.split('.');
  const [encodedPayload, encodedSignature] = parts;
  if (parts.length !== 2 || !encodedPayload || !encodedSignature) {
    return { valid: false, expired: false, payload: null, reason: 'malformed' };
  }

  let payloadJson: string;
  let payload: LicensePayload;
  try {
    payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson) as LicensePayload;
  } catch {
    return { valid: false, expired: false, payload: null, reason: 'malformed' };
  }

  let signatureValid: boolean;
  try {
    const verifier = createVerify(SIGNATURE_ALGORITHM);
    verifier.update(payloadJson);
    verifier.end();
    const signatureBuffer = Buffer.from(encodedSignature, 'base64url');
    signatureValid = verifier.verify(publicKeyPem, signatureBuffer);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return { valid: false, expired: false, payload: null, reason: 'invalid_signature' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < nowSeconds) {
    return { valid: false, expired: true, payload, reason: 'expired' };
  }

  return { valid: true, payload, expired: false };
}

/** Maps a Stripe Price ID to a WarmHawk tier. Tier 1 (Self-Hosted Pro) is sold self-serve through
 *  `app/api/checkout/session`; Tier 2 (Enterprise DFY) is "a custom-scoped one-time + retainer
 *  engagement, not a self-serve subscription toggle" (Monetization & Tiering Strategy) — sold via
 *  the "Talk to us" contact flow, not this repo's Checkout Session route — but the founder may
 *  still set the retainer up as a Stripe subscription by hand against `STRIPE_PRICE_TIER_2`, and
 *  this webhook must still recognize that event and issue a tier_2 license when it fires. Ported
 *  from warmhawk-core-engine's now-removed `stripeWebhook.ts`, which had this pattern right. */
export function tierForPriceId(priceId: string | undefined): LicenseTier {
  if (priceId && priceId === process.env.STRIPE_PRICE_TIER_2) return 'tier_2';
  return 'tier_1';
}

/** Generates a production-shaped license identifier. Only ever called from the live webhook
 *  handler — test/CI code must use an obviously-fake shape instead (see e.g.
 *  warmhawk-core-engine's `generateTestLicenseKey`). */
export function generateLicenseKey(): string {
  const random = Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
  return `whk_live_${random}`;
}

const BILLING_PERIOD_SECONDS = 31 * 24 * 60 * 60; // ~1 month grace beyond a 30-day cycle
const ANNUAL_PERIOD_SECONDS = 366 * 24 * 60 * 60; // ~1 year grace beyond a 365-day cycle

/** One current billing-period expiry (unix epoch seconds), computed from `now`, matching whichever
 *  interval the Checkout Session was created with (see `app/api/checkout/session`). Renewal
 *  (`invoice.paid` on the next cycle) re-issues a license with a fresh `expiresAt` rather than
 *  extending the old one in place. */
export function computeExpiry(now: Date, interval: 'monthly' | 'annual'): number {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return nowSeconds + (interval === 'annual' ? ANNUAL_PERIOD_SECONDS : BILLING_PERIOD_SECONDS);
}
