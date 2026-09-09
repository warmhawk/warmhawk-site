import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { issueLicense, type LicensePayload } from '@/lib/license';
import { TEST_PRIVATE_KEY as LICENSE_TEST_PRIVATE_KEY } from '@/tests/fixtures/license-keypair';

/**
 * Tests app/api/operator/relay-password-reset/route.ts — mirrors
 * app/api/operator/relay-invite/route.test.ts exactly (same route shape, same license-relay
 * mechanism, same rate-limiter convention). Real crypto for license verification; `@/lib/email` IS
 * mocked so nothing here makes a real SMTP connection.
 */
const DAY = 60 * 60 * 24;
let testCustomerIdCounter = 0;

const sendPasswordResetRelayEmailMock = vi.fn();

vi.mock('@/lib/email', () => ({
  emailSender: {
    sendPasswordResetRelayEmail: (...args: unknown[]) => sendPasswordResetRelayEmailMock(...args),
  },
}));

function licenseToken(overrides: Partial<LicensePayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return issueLicense(
    {
      licenseKey: 'whk_live_relaytest',
      customerId: `cus_reset_relay_test_${++testCustomerIdCounter}`,
      tier: 'tier_1',
      issuedAt: now,
      expiresAt: now + 30 * DAY,
      ...overrides,
    },
    LICENSE_TEST_PRIVATE_KEY,
  ).token;
}

function relayRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/operator/relay-password-reset', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const ORIGINAL_LICENSE_KEY = process.env.LICENSE_SIGNING_PRIVATE_KEY;

describe('POST /api/operator/relay-password-reset', () => {
  beforeEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = LICENSE_TEST_PRIVATE_KEY;
    sendPasswordResetRelayEmailMock.mockReset();
    sendPasswordResetRelayEmailMock.mockResolvedValue({ delivered: true });
  });

  afterEach(() => {
    process.env.LICENSE_SIGNING_PRIVATE_KEY = ORIGINAL_LICENSE_KEY;
    vi.restoreAllMocks();
  });

  it('sends the reset email and returns { delivered: true } for a currently-valid license', async () => {
    const res = await POST(
      relayRequest({
        license: licenseToken(),
        toEmail: 'member@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    const json = (await res.json()) as { delivered?: boolean };

    expect(res.status).toBe(200);
    expect(json.delivered).toBe(true);
    expect(sendPasswordResetRelayEmailMock).toHaveBeenCalledWith({
      toEmail: 'member@example.com',
      resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
    });
  });

  it('passes through a { delivered: false } result from the sender rather than treating it as an error', async () => {
    sendPasswordResetRelayEmailMock.mockResolvedValue({ delivered: false, reason: 'send_failed' });

    const res = await POST(
      relayRequest({
        license: licenseToken(),
        toEmail: 'member@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    const json = (await res.json()) as { delivered?: boolean; reason?: string };

    expect(res.status).toBe(200);
    expect(json.delivered).toBe(false);
    expect(json.reason).toBe('send_failed');
  });

  it('returns 400 and never sends when any required field is missing', async () => {
    const res = await POST(
      relayRequest({ license: licenseToken(), toEmail: 'member@example.com' }),
    );
    expect(res.status).toBe(400);
    expect(sendPasswordResetRelayEmailMock).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/operator/relay-password-reset', {
        method: 'POST',
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 and never sends for an invalid license', async () => {
    const res = await POST(
      relayRequest({
        license: 'garbage.token',
        toEmail: 'member@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    expect(res.status).toBe(401);
    expect(sendPasswordResetRelayEmailMock).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired license — no lenient "still authenticates when expired" behavior here', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = licenseToken({ issuedAt: now - 60 * DAY, expiresAt: now - DAY });

    const res = await POST(
      relayRequest({
        license: expired,
        toEmail: 'member@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    expect(res.status).toBe(401);
    expect(sendPasswordResetRelayEmailMock).not.toHaveBeenCalled();
  });

  it('returns 503 without sending when LICENSE_SIGNING_PRIVATE_KEY is not configured', async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(
      relayRequest({
        license: licenseToken(),
        toEmail: 'member@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    expect(res.status).toBe(503);
    expect(sendPasswordResetRelayEmailMock).not.toHaveBeenCalled();
  });

  it('returns 429 once a single license exceeds the daily rate limit', async () => {
    const token = licenseToken({ customerId: 'cus_reset_relay_ratelimit_test' });

    for (let i = 0; i < 10; i++) {
      const res = await POST(
        relayRequest({
          license: token,
          toEmail: `member${i}@example.com`,
          resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
        }),
      );
      expect(res.status).toBe(200);
    }

    const limited = await POST(
      relayRequest({
        license: token,
        toEmail: 'one-too-many@example.com',
        resetUrl: 'https://dashboard.example.com/reset-password?token=abc',
      }),
    );
    const json = (await limited.json()) as { error?: string };

    expect(limited.status).toBe(429);
    expect(json.error).toMatch(/too many/i);
  });
});
