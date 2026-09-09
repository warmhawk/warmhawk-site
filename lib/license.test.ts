import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  issueLicense,
  verifyLicense,
  derivePublicKeyPem,
  generateLicenseKey,
  computeExpiry,
  publicKeyFingerprint,
  checkLicenseSigningKeyFingerprint,
  EXPECTED_LICENSE_PUBLIC_KEY_FINGERPRINT,
  type LicensePayload,
} from './license';

// Test keypair lives in tests/fixtures — three suites need it now, and it is the one file
// .gitleaks.toml allowlists for real PEM key material outside .env/.env.example.
import { TEST_PRIVATE_KEY, TEST_PUBLIC_KEY } from '@/tests/fixtures/license-keypair';

function basePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    licenseKey: generateLicenseKey(),
    customerId: 'cus_test_123',
    tier: 'tier_1',
    issuedAt: now,
    expiresAt: now + 60 * 60 * 24 * 30,
    ...overrides,
  };
}

describe('RSA license sign/verify (canonical scheme)', () => {
  it('round-trips a valid tier_1 license through issue -> verify with the checked-in test keypair', () => {
    const payload = basePayload();
    const { token } = issueLicense(payload, TEST_PRIVATE_KEY);
    const result = verifyLicense(token, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toEqual(payload);
    }
  });

  it('round-trips a valid tier_2 license', () => {
    const payload = basePayload({ tier: 'tier_2', boundDomain: 'app.example.com' });
    const { token } = issueLicense(payload, TEST_PRIVATE_KEY);
    const result = verifyLicense(token, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.tier).toBe('tier_2');
      expect(result.payload.boundDomain).toBe('app.example.com');
    }
  });

  it('rejects a license signed with a different private key', () => {
    const otherKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const payload = basePayload();
    const { token } = issueLicense(payload, otherKeyPair.privateKey);
    const result = verifyLicense(token, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const payload = basePayload();
    const { token } = issueLicense(payload, TEST_PRIVATE_KEY);
    const [, signature] = token.split('.');
    const tamperedPayloadJson = JSON.stringify({ ...payload, tier: 'tier_2' });
    const tamperedEncoded = Buffer.from(tamperedPayloadJson, 'utf8').toString('base64url');
    const tamperedToken = `${tamperedEncoded}.${signature}`;
    const result = verifyLicense(tamperedToken, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('reports expired for a license whose expiresAt has passed, distinct from invalid signature', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = basePayload({ issuedAt: now - 1000, expiresAt: now - 100 });
    const { token } = issueLicense(payload, TEST_PRIVATE_KEY);
    const result = verifyLicense(token, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('rejects a malformed token', () => {
    const result = verifyLicense('not-a-valid-token-at-all', TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('malformed');
    }
  });

  // Regression test for the 2026-09-08 prod outage: LICENSE_SIGNING_PRIVATE_KEY was stored in the
  // deployment secret with literal `\n` instead of real newlines (produced by
  // scripts/generate-license-keypair.sh's escape_for_env()), and every call site here crashed
  // trying to parse it. issueLicense/verifyLicense/derivePublicKeyPem now tolerate either form.
  it('signs and verifies correctly when the private/public key PEMs have literal \\n instead of real newlines', () => {
    const escapedPrivateKey = TEST_PRIVATE_KEY.replace(/\n/g, '\\n');
    const escapedPublicKey = TEST_PUBLIC_KEY.replace(/\n/g, '\\n');

    const payload = basePayload();
    const { token } = issueLicense(payload, escapedPrivateKey);
    const result = verifyLicense(token, escapedPublicKey);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toEqual(payload);
    }

    expect(derivePublicKeyPem(escapedPrivateKey).trim()).toBe(TEST_PUBLIC_KEY.trim());
  });
});

describe('publicKeyFingerprint', () => {
  it('is a deterministic 64-char hex sha256 of the PEM text', () => {
    const fp = publicKeyFingerprint(TEST_PUBLIC_KEY);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(publicKeyFingerprint(TEST_PUBLIC_KEY)).toBe(fp);
  });

  it('changes when the key changes', () => {
    const otherKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    expect(publicKeyFingerprint(otherKeyPair.publicKey)).not.toBe(
      publicKeyFingerprint(TEST_PUBLIC_KEY),
    );
  });
});

describe('checkLicenseSigningKeyFingerprint', () => {
  // Regression test for the 2026-09-09 incident: LICENSE_SIGNING_PRIVATE_KEY changed in production
  // with nothing to notice it, silently invalidating every already-issued license's signature. This
  // is the function instrumentation.ts calls once at boot (production only) to turn that into a
  // refused deploy instead. Never exercised against the real pinned production constant here — see
  // the `expectedFingerprint` param's own doc comment for why.

  it('reports ok:true when the derived fingerprint matches what was expected', () => {
    const expected = publicKeyFingerprint(derivePublicKeyPem(TEST_PRIVATE_KEY));
    expect(checkLicenseSigningKeyFingerprint(TEST_PRIVATE_KEY, expected)).toEqual({ ok: true });
  });

  it('reports ok:false with both fingerprints when the live key no longer matches — the exact 2026-09-09 failure mode', () => {
    const otherKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const wrongExpectation = publicKeyFingerprint(otherKeyPair.publicKey);
    const actual = publicKeyFingerprint(derivePublicKeyPem(TEST_PRIVATE_KEY));

    expect(checkLicenseSigningKeyFingerprint(TEST_PRIVATE_KEY, wrongExpectation)).toEqual({
      ok: false,
      expectedFingerprint: wrongExpectation,
      actualFingerprint: actual,
    });
  });

  it('defaults to the real pinned EXPECTED_LICENSE_PUBLIC_KEY_FINGERPRINT constant when no override is passed', () => {
    // Confirms the wiring, not the value: a throwaway key will never match the real pinned constant,
    // but the returned expectedFingerprint must be exactly that constant, unmodified.
    const result = checkLicenseSigningKeyFingerprint(TEST_PRIVATE_KEY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.expectedFingerprint).toBe(EXPECTED_LICENSE_PUBLIC_KEY_FINGERPRINT);
    }
  });

  it('tolerates a literal \\n private key PEM, matching every other function in this module', () => {
    const escapedPrivateKey = TEST_PRIVATE_KEY.replace(/\n/g, '\\n');
    const expected = publicKeyFingerprint(derivePublicKeyPem(TEST_PRIVATE_KEY));
    expect(checkLicenseSigningKeyFingerprint(escapedPrivateKey, expected)).toEqual({ ok: true });
  });
});

describe('computeExpiry', () => {
  it('returns a unix-seconds expiry roughly 31 days out for monthly', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiry = computeExpiry(now, 'monthly');
    const days = (expiry - Math.floor(now.getTime() / 1000)) / 86_400;
    expect(days).toBeCloseTo(31, 0);
  });

  it('returns a unix-seconds expiry roughly 366 days out for annual', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiry = computeExpiry(now, 'annual');
    const days = (expiry - Math.floor(now.getTime() / 1000)) / 86_400;
    expect(days).toBeCloseTo(366, 0);
  });

  it('applies the same monthly expiry to Tier 2 — it bills monthly too, just with an extra one-time setup fee on the first invoice', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiry = computeExpiry(now, 'monthly');
    const days = (expiry - Math.floor(now.getTime() / 1000)) / 86_400;
    expect(days).toBeCloseTo(31, 0);
  });
});
