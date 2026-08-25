import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Tests app/api/contact-sales/route.ts — the new Tier 2 (Enterprise DFY) contact-sales route
 * (Part B). Mocks `@/lib/email`'s emailSender so this never sends real mail; the route's job is
 * validating the submission and creating a sales inquiry, never a Stripe charge — see the route's
 * own doc comment for why Tier 2 must never touch Stripe Checkout.
 */
const sendSalesInquiryEmailMock = vi.fn();

vi.mock('@/lib/email', () => ({
  emailSender: {
    sendLicenseEmail: vi.fn(),
    sendSalesInquiryEmail: (...args: unknown[]) => sendSalesInquiryEmailMock(...args),
  },
}));

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/contact-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  company: 'Acme Outreach Agency',
  name: 'Alex Rivera',
  email: 'alex@acme-outreach.com',
  volume: '24 domains, 60 mailboxes',
  notes: 'Migrating off Instantly next quarter.',
};

describe('POST /api/contact-sales', () => {
  beforeEach(() => {
    sendSalesInquiryEmailMock.mockReset();
  });

  it('rejects a submission missing required fields', async () => {
    const res = await POST(postRequest({ company: 'Acme' }));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(422);
    expect(json.error).toBeTruthy();
    expect(sendSalesInquiryEmailMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address', async () => {
    const res = await POST(postRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(res.status).toBe(422);
    expect(sendSalesInquiryEmailMock).not.toHaveBeenCalled();
  });

  it('rejects an unparsable JSON body', async () => {
    const req = new NextRequest('http://localhost/api/contact-sales', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('sends a sales inquiry email and returns received:true for a valid submission', async () => {
    sendSalesInquiryEmailMock.mockResolvedValue(undefined);

    const res = await POST(postRequest(VALID_BODY));
    const json = (await res.json()) as { received?: boolean };

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(sendSalesInquiryEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Acme Outreach Agency',
        name: 'Alex Rivera',
        email: 'alex@acme-outreach.com',
        volume: '24 domains, 60 mailboxes',
        notes: 'Migrating off Instantly next quarter.',
      }),
    );
  });

  it('defaults notes to an empty string when omitted', async () => {
    sendSalesInquiryEmailMock.mockResolvedValue(undefined);
    const withoutNotes = {
      company: VALID_BODY.company,
      name: VALID_BODY.name,
      email: VALID_BODY.email,
      volume: VALID_BODY.volume,
    };

    await POST(postRequest(withoutNotes));

    expect(sendSalesInquiryEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ notes: '' }),
    );
  });

  it('returns 502 without crashing if the email send fails', async () => {
    sendSalesInquiryEmailMock.mockRejectedValue(new Error('smtp down'));

    const res = await POST(postRequest(VALID_BODY));
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toBeTruthy();
  });
});
