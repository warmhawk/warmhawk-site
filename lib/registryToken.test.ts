import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, createSign } from 'node:crypto';
import {
  mintRegistryToken,
  verifyRegistryToken,
  derivePublicKeyPem,
  REGISTRY_TOKEN_ISSUER,
} from './registryToken';

/**
 * Tests lib/registryToken.ts's RS256 sign/verify round trip -- the Docker Registry v2 Token
 * Authentication JWT app/api/registry/token mints after verifying a license. Deliberately generates
 * its OWN throwaway RSA keypair at module scope (`generateKeyPairSync`, same technique
 * lib/license.test.ts's "rejects a license signed with a different private key" test already uses)
 * rather than a checked-in fixture like tests/fixtures/license-keypair.ts -- this module's whole
 * point is a keypair independent of the license one, and nothing outside this file needs a stable,
 * cross-suite-shared test value for it (unlike the license keypair, which three separate suites and
 * two repos' .env.example files all need to agree on).
 */
let TEST_PRIVATE_KEY: string;
let TEST_PUBLIC_KEY: string;

beforeAll(() => {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  TEST_PRIVATE_KEY = keyPair.privateKey;
  TEST_PUBLIC_KEY = keyPair.publicKey;
});

describe('registry token mint/verify (RS256, Docker Registry v2 Token Authentication)', () => {
  it('round-trips a minted token through verify with the matching public key', () => {
    const token = mintRegistryToken({
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    });
    const result = verifyRegistryToken(token, TEST_PUBLIC_KEY);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.sub).toBe('whk_live_test123');
      expect(result.payload.aud).toBe('registry.warmhawk.com');
      expect(result.payload.iss).toBe(REGISTRY_TOKEN_ISSUER);
    }
  });

  it('always grants exactly repository:warmhawk/enterprise-operator:pull, regardless of caller input', () => {
    const token = mintRegistryToken({
      subject: 'anything',
      service: 'anything.example.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    });
    const result = verifyRegistryToken(token, TEST_PUBLIC_KEY);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.access).toEqual([
        { type: 'repository', name: 'warmhawk/enterprise-operator', actions: ['pull'] },
      ]);
    }
  });

  it('mints a token with a 300-second TTL (exp - iat)', () => {
    const token = mintRegistryToken({
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    });
    const result = verifyRegistryToken(token, TEST_PUBLIC_KEY);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.exp - result.payload.iat).toBe(300);
    }
  });

  it('mints a fresh jti on every call, even for identical inputs', () => {
    const options = {
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    };
    const first = verifyRegistryToken(mintRegistryToken(options), TEST_PUBLIC_KEY);
    const second = verifyRegistryToken(mintRegistryToken(options), TEST_PUBLIC_KEY);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (first.valid && second.valid) {
      expect(first.payload.jti).not.toBe(second.payload.jti);
    }
  });

  it('rejects a token signed with a different private key', () => {
    const otherKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = mintRegistryToken({
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: otherKeyPair.privateKey,
    });
    const result = verifyRegistryToken(token, TEST_PUBLIC_KEY);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const token = mintRegistryToken({
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    });
    const [header, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'someone-else',
        access: [{ type: 'repository', name: 'x', actions: ['push'] }],
      }),
      'utf8',
    ).toString('base64url');
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    const result = verifyRegistryToken(tamperedToken, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('reports expired for a token whose exp has passed, distinct from invalid signature', () => {
    // mintRegistryToken always mints a 300s-TTL token, so to exercise expiry this signs a payload
    // by hand with the same shape/algorithm rather than waiting 5 real minutes.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256' }), 'utf8').toString(
      'base64url',
    );
    const payload = Buffer.from(
      JSON.stringify({
        iss: REGISTRY_TOKEN_ISSUER,
        sub: 'whk_live_test123',
        aud: 'registry.warmhawk.com',
        exp: nowSeconds - 100,
        nbf: nowSeconds - 1000,
        iat: nowSeconds - 1000,
        jti: 'expired-test-jti',
        access: [{ type: 'repository', name: 'warmhawk/enterprise-operator', actions: ['pull'] }],
      }),
      'utf8',
    ).toString('base64url');
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    signer.end();
    const signature = signer.sign(TEST_PRIVATE_KEY).toString('base64url');
    const expiredToken = `${header}.${payload}.${signature}`;

    const result = verifyRegistryToken(expiredToken, TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('rejects a malformed token', () => {
    const result = verifyRegistryToken('not-a-valid-token-at-all', TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('malformed');
    }
  });

  it('rejects a two-part (license-shaped, not JWT-shaped) token', () => {
    const result = verifyRegistryToken('onlyone.parthere', TEST_PUBLIC_KEY);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('malformed');
    }
  });
});

describe('derivePublicKeyPem', () => {
  it('derives a public key that successfully verifies a token signed with the matching private key', () => {
    const derived = derivePublicKeyPem(TEST_PRIVATE_KEY);
    const token = mintRegistryToken({
      subject: 'whk_live_test123',
      service: 'registry.warmhawk.com',
      privateKeyPem: TEST_PRIVATE_KEY,
    });
    expect(verifyRegistryToken(token, derived).valid).toBe(true);
  });
});
