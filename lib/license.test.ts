import { describe, it, expect, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  issueLicense,
  verifyLicense,
  tierForPriceId,
  generateLicenseKey,
  computeExpiry,
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
});

describe('tierForPriceId', () => {
  const ORIGINAL_ENV = process.env.STRIPE_PRICE_TIER_2;

  afterEach(() => {
    process.env.STRIPE_PRICE_TIER_2 = ORIGINAL_ENV;
  });

  it('defaults to tier_1 for the self-serve monthly/annual price', () => {
    process.env.STRIPE_PRICE_TIER_2 = 'price_tier2_test';
    expect(tierForPriceId('price_self_hosted_pro_monthly')).toBe('tier_1');
    expect(tierForPriceId(undefined)).toBe('tier_1');
  });

  it('resolves tier_2 only for the configured STRIPE_PRICE_TIER_2', () => {
    process.env.STRIPE_PRICE_TIER_2 = 'price_tier2_test';
    expect(tierForPriceId('price_tier2_test')).toBe('tier_2');
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
});
