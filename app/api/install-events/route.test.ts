import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Tests app/api/install-events/route.ts — the failure beacon
 * warmhawk-enterprise-operator's install.sh/update.sh call from inside their own fail() helper.
 * Mocks `@/lib/email`'s emailSender so this never sends real mail. Every rejection path returns a
 * bare 204 rather than an error status/body — this is a fire-and-forget beacon from a customer's
 * shell script, not a request anything inspects the response of.
 */
const sendInstallFailureEmailMock = vi.fn();

vi.mock('@/lib/email', () => ({
  emailSender: {
    sendInstallFailureEmail: (...args: unknown[]) => sendInstallFailureEmailMock(...args),
  },
}));

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/install-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  script: 'install',
  event: 'install_failed',
  domain: 'dashboard.acme.com',
  message: 'Could not authenticate to registry.warmhawk.com',
};

describe('POST /api/install-events', () => {
  beforeEach(() => {
    sendInstallFailureEmailMock.mockReset();
  });

  it('notifies support and returns 204 for a valid failure report', async () => {
    sendInstallFailureEmailMock.mockResolvedValue(undefined);

    const res = await POST(postRequest(VALID_BODY));

    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: 'install',
        domain: 'dashboard.acme.com',
        message: 'Could not authenticate to registry.warmhawk.com',
      }),
    );
  });

  it('passes the caller IP through from X-Real-IP', async () => {
    sendInstallFailureEmailMock.mockResolvedValue(undefined);

    await POST(postRequest(VALID_BODY, { 'x-real-ip': '203.0.113.9' }));

    expect(sendInstallFailureEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ reporterIp: '203.0.113.9' }),
    );
  });

  it('rejects an unrecognized script value without emailing', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, script: 'uninstall' }));
    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized event value without emailing', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, event: 'something_else' }));
    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).not.toHaveBeenCalled();
  });

  it('rejects a body with no message without emailing', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, message: '' }));
    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).not.toHaveBeenCalled();
  });

  it('does not crash on an unparsable JSON body', async () => {
    const req = new NextRequest('http://localhost/api/install-events', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).not.toHaveBeenCalled();
  });

  it('strips control characters and caps message length rather than passing it through raw', async () => {
    sendInstallFailureEmailMock.mockResolvedValue(undefined);
    const dirty = `bad\x00byte ${'x'.repeat(3000)}`;

    await POST(postRequest({ ...VALID_BODY, message: dirty }));

    const sentMessage = sendInstallFailureEmailMock.mock.calls[0]![0].message as string;
    expect(sentMessage).not.toContain('\x00');
    expect(sentMessage.length).toBeLessThanOrEqual(2000);
  });

  it('still returns 204 without crashing if the email send throws', async () => {
    sendInstallFailureEmailMock.mockRejectedValue(new Error('zeptomail down'));

    const res = await POST(postRequest(VALID_BODY));

    expect(res.status).toBe(204);
  });

  it('rate-limits a flood from the same IP, degrading to 204 without emailing', async () => {
    sendInstallFailureEmailMock.mockResolvedValue(undefined);
    const ip = '198.51.100.7';

    for (let i = 0; i < 30; i++) {
      await POST(postRequest(VALID_BODY, { 'x-real-ip': ip }));
    }
    sendInstallFailureEmailMock.mockClear();

    const res = await POST(postRequest(VALID_BODY, { 'x-real-ip': ip }));

    expect(res.status).toBe(204);
    expect(sendInstallFailureEmailMock).not.toHaveBeenCalled();
  });
});
