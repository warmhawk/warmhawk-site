import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Stripe checkout & webhooks',
  description:
    'What WarmHawk&rsquo;s Stripe webhook actually does, what to do if you paid but never received your install command, and how to update payment method or cancel self-serve via the Stripe Customer Portal.',
  path: '/docs/stripe-webhooks',
});

const faqItems = [
  {
    question: 'Does cancelling my subscription immediately shut off my instance?',
    answer:
      'No. Your license carries an embedded expiry through the end of the billing period you already paid for, and LicenseGate checks against that expiry roughly once a day — so your instance keeps working until that date, not the moment you click cancel.',
  },
  {
    question: 'I completed checkout but never got an email with my install command. What do I do?',
    answer:
      'Check spam/junk first — the confirmation email is triggered by the same webhook that issues your license, so if the email is missing the webhook may still be delivering. If it&rsquo;s genuinely not there after checking spam, email support@warmhawk.com with your Stripe receipt.',
  },
  {
    question: 'Can I update my card or switch to annual billing without contacting support?',
    answer:
      'Yes — the Stripe Customer Portal link (sent in your original receipt email, or available from support on request) lets you update payment method, change plan, or cancel entirely, self-serve, with no ticket required.',
  },
  {
    question: 'What happens on the backend when a payment fails?',
    answer:
      'A failed payment (invoice.payment_failed) or an explicit cancellation (subscription.deleted) does not actively revoke your license. It simply isn&rsquo;t renewed — the existing license expires naturally at its already-embedded date rather than being yanked immediately.',
  },
];

export default function StripeWebhooksPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Docs / Stripe checkout &amp; webhooks</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        What happens between your card and your license.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        WarmHawk operates the Stripe checkout and webhook centrally, on warmhawk.com itself &mdash;
        it never runs inside your self-hosted instance, and the license-signing key never leaves
        WarmHawk&rsquo;s own infrastructure. This page is for understanding what happens behind the
        scenes, and what you can do yourself versus what needs support.
      </p>
      <AnswerBlock>
        This page explains what WarmHawk&rsquo;s Stripe webhook does (issuing or expiring your
        license), what to do if you paid but never received your install command email, and how to
        update your payment method or cancel entirely through the self-serve Stripe Customer Portal
        without opening a support ticket.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">What the webhook actually does</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        WarmHawk listens for a small set of Stripe subscription events and reacts to each one
        differently:
      </p>
      <ul className="list-disc pl-6 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">invoice.paid</strong> &mdash; issues a new RSA-signed
          license key with an expiry set to the current billing period, and sends you the
          confirmation email containing your install command with that license embedded. Fires
          for your very first invoice and every renewal after that, so this is the only event
          WarmHawk needs to keep your license current.
        </li>
        <li>
          <strong className="text-ink">invoice.payment_failed</strong> &mdash; does not revoke
          anything. Your existing license simply isn&rsquo;t renewed, so it continues to hold until
          its already-embedded expiry, giving Stripe&rsquo;s own retry schedule a chance to recover
          the payment first.
        </li>
        <li>
          <strong className="text-ink">customer.subscription.deleted</strong> &mdash; same
          treatment: no active revocation. The most recently issued license simply expires at its
          embedded date and isn&rsquo;t renewed again.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        This is a deliberate design choice: WarmHawk never has to reach into your running instance to
        turn it off. See{' '}
        <Link href="/docs/license-activation" className="text-rust font-semibold">
          license activation troubleshooting
        </Link>{' '}
        for how the dashboard&rsquo;s side of this &mdash; the daily <code className="font-mono">LicenseGate</code> re-check
        &mdash; actually enforces it.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Paid, but never got the install command email</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The install command &mdash; with your license key embedded &mdash; is sent by the same
        webhook flow that issues the license. If checkout succeeded but the email never arrived:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        <li>Check spam/junk/promotions first &mdash; this is the most common cause by far.</li>
        <li>
          Confirm the checkout actually completed by checking your card statement or the Stripe
          receipt Stripe itself sends independently of WarmHawk.
        </li>
        <li>
          If it&rsquo;s genuinely missing after checking spam, email{' '}
          <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
            support@warmhawk.com
          </a>{' '}
          with your Stripe receipt attached (or the last four digits of the card and the charge
          date) &mdash; we can look up the checkout session and resend the install command directly.
        </li>
      </ol>

      <h2 className="font-display text-2xl font-semibold mb-4">Updating payment method or cancelling</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        You don&rsquo;t need a support ticket for routine billing changes. The Stripe Customer
        Portal &mdash; linked in your original receipt email &mdash; lets you self-serve:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>Update your card on file</li>
        <li>Switch between monthly and annual billing</li>
        <li>Download past invoices/receipts</li>
        <li>Cancel your subscription outright</li>
      </ul>
      <CodeBlock label="Can't find the portal link? Ask support to resend it">
{`# Email support@warmhawk.com with your Stripe customer email —
# we'll send a fresh Customer Portal link, no ticket investigation required.`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-6 mb-14">
        Remember that cancelling doesn&rsquo;t cut your instance off immediately &mdash; your license
        already carries an expiry through the end of the period you paid for, and the dashboard
        checks against that once a day rather than instantly.
      </p>

      <FaqSection items={faqItems} title="Stripe checkout & webhooks: questions worth answering up front" />
    </div>
  );
}
