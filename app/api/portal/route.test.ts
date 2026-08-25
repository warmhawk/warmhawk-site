import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Tests app/api/portal/route.ts — Stripe Customer Portal session creation. Mocks `@/lib/stripe`
 * so this never hits a live Stripe API, following the same convention as the checkout/session and
 * stripe/webhook route tests.
 */
const createPortalSessionMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({ billingPortal: { sessions: { create: createPortalSessionMock } } }),
}));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal', () => {
  beforeEach(() => {
    createPortalSessionMock.mockReset();
  });

  it('returns 400 when stripeCustomerId is missing', async () => {
    const res = await POST(postRequest({}));
    const json = (await res.json()) as { error?: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain('stripeCustomerId');
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparsable body', async () => {
    const req = new NextRequest('http://localhost/api/portal', { method: 'POST', body: 'not json' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates a portal session and returns its url', async () => {
    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });

    const res = await POST(postRequest({ stripeCustomerId: 'cus_test_123' }));
    const json = (await res.json()) as { url?: string };

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://billing.stripe.com/session/test');
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_123' }),
    );
  });

  it('returns 502 and never leaks Stripe’s internal error message when session creation throws', async () => {
    createPortalSessionMock.mockRejectedValue(new Error('sk_live_super_secret_detail'));

    const res = await POST(postRequest({ stripeCustomerId: 'cus_test_123' }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).not.toContain('sk_live_super_secret_detail');
  });
});
