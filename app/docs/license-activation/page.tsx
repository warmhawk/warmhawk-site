import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'License activation troubleshooting',
  description:
    'How WarmHawk license activation is supposed to work, what "license invalid" and "license expired" errors mean, how LicenseGate&rsquo;s daily re-validation works, and what to do if a payment succeeded but the dashboard disagrees.',
  path: '/docs/license-activation',
});

const faqItems = [
  {
    question: 'Do I need to paste my license key into the dashboard separately?',
    answer:
      'No. The license passed via --license during install.sh flows straight into the dashboard&rsquo;s activation on first boot. There is no separate "enter your license" step anywhere in the UI — if you&rsquo;re looking for one, you&rsquo;re not missing it.',
  },
  {
    question: 'I paid on Stripe, but the dashboard still says unlicensed. What&rsquo;s wrong?',
    answer:
      'This almost always means the Stripe webhook that issues the license hasn&rsquo;t reached WarmHawk yet — a delayed or failed webhook delivery, not a problem with your payment. Check Stripe webhook delivery status before assuming anything is broken on your server.',
  },
  {
    question: 'My subscription lapsed a few hours ago but the dashboard still works — is that a bug?',
    answer:
      'No, that&rsquo;s by design. LicenseGate re-validates against the license&rsquo;s embedded expiry once a day, not continuously, so there&rsquo;s a bounded grace window rather than an instant, jarring lockout the moment a payment fails.',
  },
  {
    question: 'Can support manually re-activate a license for me?',
    answer:
      'Yes, if the automated path is genuinely stuck — email support@warmhawk.com with your Stripe receipt or customer ID and we&rsquo;ll check webhook delivery and re-issue the license by hand if needed.',
  },
];

export default function LicenseActivationPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / License activation</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        License activation, and why it locks out slowly, not instantly.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Activation is meant to be invisible &mdash; a license flows in from Stripe, through
        install.sh, straight into the dashboard, with no manual paste-in step. This page covers
        what to check when that path doesn&rsquo;t look right.
      </p>
      <AnswerBlock>
        This page explains how WarmHawk license activation works end to end: the license passed via
        --license during install, no separate dashboard paste-in step, what &ldquo;invalid&rdquo; or
        &ldquo;expired&rdquo; errors mean, how the dashboard&rsquo;s daily re-validation check works,
        and what to do if a real payment succeeded but the dashboard still shows unlicensed.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">How activation is supposed to work</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Your license key is issued the moment your Stripe checkout completes, and you pass it
        directly into the install command:
      </p>
      <CodeBlock label="License passed at install time">
{`curl -fsSL https://warmhawk.com/install-dashboard | bash -s -- \\
  --license whk_live_a1b2c3d4e5f6 \\
  --domain app.yourcompany.com \\
  --core-engine-url https://api.yourcompany.com \\
  --owner-email you@yourcompany.com`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        install.sh writes that key into your instance&rsquo;s <code className="font-mono">.env</code> and
        the dashboard&rsquo;s activation flow reads it from there on first boot &mdash; there is no
        separate &ldquo;paste your license here&rdquo; screen anywhere in the product. If activation
        looks broken, the license itself, or the path it took to get here, is what to check.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">What &ldquo;invalid&rdquo; and &ldquo;expired&rdquo; actually mean</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The dashboard&rsquo;s <code className="font-mono">LicenseGate</code> distinguishes two
        failure states, and they point at different problems:
      </p>
      <ul className="list-disc pl-6 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">License invalid</strong> &mdash; the key&rsquo;s RSA signature
          doesn&rsquo;t verify. This usually means the key was mistyped, truncated when copied, or
          belongs to a different product/environment (a{' '}
          <code className="font-mono">whk_test_</code> key against a production instance, for
          example). Double-check the exact string against what Stripe/your confirmation email sent.
        </li>
        <li>
          <strong className="text-ink">License expired</strong> &mdash; the signature is valid, but
          the embedded expiry timestamp has passed. This is the expected, working state for a
          subscription that lapsed &mdash; not a bug. See the re-validation section below for the
          timing.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-semibold mb-4">How LicenseGate&rsquo;s daily re-validation works</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every license has an expiry embedded in it at issuance, tied to the current Stripe billing
        period. <code className="font-mono">LicenseGate</code> checks the current time against that
        embedded expiry roughly once a day &mdash; it does not phone home to Stripe or WarmHawk on
        every page load, and it does not actively revoke anything the moment a payment fails.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        In practice this means a lapsed subscription locks the dashboard out naturally at its
        embedded expiry date, on the next daily check &mdash; not the instant a card is declined.
        That&rsquo;s deliberate: it avoids a jarring mid-session lockout over a same-day billing
        hiccup, while still guaranteeing access stops within about a day of a subscription actually
        ending.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Paid, but the dashboard still shows unlicensed</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        This is almost never a payment problem &mdash; it&rsquo;s a webhook delivery problem. Your
        Stripe checkout succeeding and your license actually reaching your instance are two separate
        steps connected by a webhook, and that webhook can be delayed, retried, or fail to reach the
        endpoint.
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        <li>
          Confirm the Stripe checkout actually completed &mdash; check your email for a receipt, or
          the Stripe Customer Portal.
        </li>
        <li>
          Check whether the webhook that issues the license was delivered and processed
          successfully &mdash; see{' '}
          <Link href="/docs/stripe-webhooks" className="text-rust font-semibold">
            Stripe checkout &amp; webhooks
          </Link>{' '}
          for exactly what to look for in the Stripe Dashboard&rsquo;s webhook delivery log.
        </li>
        <li>
          If the webhook shows as delivered and succeeded but activation still fails, email{' '}
          <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
            support@warmhawk.com
          </a>{' '}
          with your Stripe receipt or customer ID.
        </li>
      </ol>

      <h2 className="font-display text-2xl font-semibold mb-4">Still stuck? Contact support</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-14">
        If you&rsquo;ve confirmed payment succeeded and webhook delivery looks fine but activation
        still won&rsquo;t go through, email{' '}
        <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
          support@warmhawk.com
        </a>{' '}
        with your Stripe receipt and the exact error text shown in the dashboard. Support is
        founder-staffed: expect a response within 1 business day, or 4 business hours for a
        production instance that&rsquo;s fully locked out.
      </p>

      <FaqSection items={faqItems} title="License activation: questions worth answering up front" />
    </div>
  );
}
