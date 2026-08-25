import { NextRequest, NextResponse } from 'next/server';
import { emailSender } from '@/lib/email';

/**
 * Tier 2 (Enterprise DFY) contact form receiver — /checkout's Tier 2 tab.
 *
 * Per the Monetization & Tiering Strategy: Tier 2 is "a custom-scoped one-time + retainer
 * engagement, not a self-serve subscription toggle" — this creates a SALES INQUIRY, never a
 * charge. It must never be wired to Stripe Checkout (see app/api/checkout/session, which only
 * ever sells Tier 1). On a valid submission it notifies the sales inbox via lib/email.ts's
 * sendSalesInquiryEmail, reusing the exact SMTP mechanism app/api/stripe/webhook already uses for
 * license delivery, sent to siteConfig.helloEmail (the same address tier2's old mailto CTA used —
 * no new env var invented for this).
 *
 * Body: { company, name, email, volume, notes? }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const volume = typeof body.volume === 'string' ? body.volume.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (!company || !name || !email || !volume) {
    return NextResponse.json(
      { error: 'company, name, email, and volume are required' },
      { status: 422 },
    );
  }

  // Simple format check — this route's only job is routing a real inquiry to a human, not
  // exhaustive email validation.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid work email address is required' }, { status: 422 });
  }

  try {
    await emailSender.sendSalesInquiryEmail({ company, name, email, volume, notes });
  } catch (error) {
    console.error('Failed to send Tier 2 sales inquiry email', error);
    return NextResponse.json(
      {
        error:
          'Could not submit your request right now. Email hello@warmhawk.com directly and we’ll follow up.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
}
