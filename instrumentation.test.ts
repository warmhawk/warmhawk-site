import { describe, it, expect, afterEach, vi } from 'vitest';
import { register } from './instrumentation';
import { TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * Regression coverage for the 2026-09-09 incident: LICENSE_SIGNING_PRIVATE_KEY changed in
 * production with nothing to notice it, silently invalidating every already-issued license's
 * signature. register() now asserts the fingerprint at boot, production only — these tests exercise
 * that gate directly rather than lib/license.ts's underlying check function, since the interesting
 * behavior here is register()'s own wiring: which env var gates the check, and that a mismatch
 * throws (refusing to boot) rather than merely logging.
 */
describe('register() — license-signing-key boot guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does nothing on the edge runtime, before even looking at the license key', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://warmhawk.com');
    vi.stubEnv('LICENSE_SIGNING_PRIVATE_KEY', 'not a real pem');

    await expect(register()).resolves.toBeUndefined();
  });

  it('never checks on stage or any non-production deployment, even with a key configured', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://stage.warmhawk.com');
    vi.stubEnv('LICENSE_SIGNING_PRIVATE_KEY', 'not a real pem — would throw if this were parsed');

    await expect(register()).resolves.toBeUndefined();
  });

  it('does not throw on production when no key is configured — existing routes already 503 clearly for this case', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://warmhawk.com');
    vi.stubEnv('LICENSE_SIGNING_PRIVATE_KEY', '');

    await expect(register()).resolves.toBeUndefined();
  });

  it('refuses to boot on production when the live key no longer matches the pinned fingerprint — the exact 2026-09-09 failure mode', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://warmhawk.com');
    // The checked-in test keypair will never match the real pinned production fingerprint.
    vi.stubEnv('LICENSE_SIGNING_PRIVATE_KEY', TEST_PRIVATE_KEY);

    await expect(register()).rejects.toThrow(/does not derive the pinned production public key/);
  });
});
