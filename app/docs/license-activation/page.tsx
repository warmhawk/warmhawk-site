import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'License activation troubleshooting',
  description:
    'How WarmHawk license activation is supposed to work, what "license invalid" and "license expired" errors mean, how LicenseGate&rsquo;s daily re-validation and self-refresh work at renewal, and what to do if a payment succeeded but the dashboard disagrees.',
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
    question:
      'My subscription lapsed a few hours ago but the dashboard still works — is that a bug?',
    answer:
      'No, that&rsquo;s by design. LicenseGate re-validates against the license&rsquo;s embedded expiry once a day, not continuously, so there&rsquo;s a bounded grace window rather than an instant, jarring lockout the moment a payment fails.',
  },
  {
    question: 'Do I have to re-install every month when my license renews?',
    answer:
      'No. Your dashboard refreshes its own license once a day — it presents the token it already holds and gets a freshly signed one back, as long as your subscription is still paying. There is also a "Refresh license" button on the expired screen and under Settings → Billing if you want it applied immediately. An expired token is still accepted for refreshing, so being locked out never stops you recovering on your own.',
  },
  {
    question: 'What exactly do I pass to --license?',
    answer:
      'The long two-part token from your purchase email, hundreds of characters long — not the short whk_live_ value. That short one is only a human-readable identifier for support to reference; it carries no signature, so passing it to --license fails as "License invalid".',
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
        install.sh, straight into the dashboard, with no manual paste-in step. This page covers what
        to check when that path doesn&rsquo;t look right.
      </p>
      <AnswerBlock>
        This page explains how WarmHawk license activation works end to end: the license passed via
        --license during install, no separate dashboard paste-in step, what &ldquo;invalid&rdquo; or
        &ldquo;expired&rdquo; errors mean, how the dashboard&rsquo;s daily check both re-validates
        and self-refreshes the license at renewal, and what to do if a real payment succeeded but
        the dashboard still shows unlicensed.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">
        How activation is supposed to work
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Your license key is issued the moment your Stripe checkout completes, and you pass it
        directly into the install command:
      </p>
      <CodeBlock label="License passed at install time">
        {`curl -fsSL https://warmhawk.com/install | bash -s -- \\
  --license <token-from-your-purchase-email> \\
  --domain yourcompany.com \\
  --owner-email you@yourcompany.com`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-6">
        Pass your <strong>bare company domain</strong> &mdash; the installer derives{' '}
        <code className="font-mono">api.yourcompany.com</code> for the engine and{' '}
        <code className="font-mono">dashboard.yourcompany.com</code> for the dashboard, and wires
        the two together for you.
      </p>

      <div className="card bg-cream-elevated p-5 border-l-2 border-rust max-w-2xl mb-10">
        <p className="text-[15px] leading-relaxed text-ink-muted">
          <strong className="text-ink">
            Your license is the long token, not the short identifier.
          </strong>{' '}
          Your purchase email contains a two-part string hundreds of characters long, like{' '}
          <code className="font-mono text-[13px]">eyJsaWNlbnNlS2V5Ijoi…&#46;Qk9mVzRy…</code> &mdash;{' '}
          <em>that</em> is what <code className="font-mono">--license</code> takes. The short{' '}
          <code className="font-mono">whk_live_…</code> value is just a human-readable identifier
          for support to reference; passing it to <code className="font-mono">--license</code> fails
          as <strong className="text-ink">License invalid</strong>, because it carries no signature
          to verify. If you hit that error, this is the first thing to check.
        </p>
      </div>

      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        install.sh writes that token into your instance&rsquo;s{' '}
        <code className="font-mono">.env</code> and the dashboard&rsquo;s activation flow reads it
        from there on first boot &mdash; there is no separate &ldquo;paste your license here&rdquo;
        screen anywhere in the product. If activation looks broken, the license itself, or the path
        it took to get here, is what to check.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        What &ldquo;invalid&rdquo; and &ldquo;expired&rdquo; actually mean
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The dashboard&rsquo;s <code className="font-mono">LicenseGate</code> distinguishes two
        failure states, and they point at different problems:
      </p>
      <ul className="list-disc pl-6 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">License invalid</strong> &mdash; the token&rsquo;s RSA
          signature doesn&rsquo;t verify. In order of how often it&rsquo;s actually the cause: the
          short <code className="font-mono">whk_live_</code> identifier was pasted instead of the
          full token; the token was truncated when copied (it&rsquo;s long, and terminals wrap it);
          or it belongs to a different environment than the instance you&rsquo;re installing.
          Compare the exact string against your confirmation email.
        </li>
        <li>
          <strong className="text-ink">License expired</strong> &mdash; the signature is valid, but
          the embedded expiry timestamp has passed. This is the expected, working state for a
          subscription that lapsed &mdash; not a bug. If your subscription is still active, it just
          means your instance is holding last period&rsquo;s token; use{' '}
          <strong className="text-ink">Refresh license</strong> in the dashboard, covered below.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-semibold mb-4">
        How LicenseGate&rsquo;s daily re-validation works
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Every license has an expiry embedded in it at issuance, tied to the current Stripe billing
        period. <code className="font-mono">LicenseGate</code> checks the current time against that
        embedded expiry, and attempts a refresh, roughly once a day &mdash; not on every page load,
        and it does not actively revoke anything the moment a payment fails.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Between those daily checks, the gate is reading a signed token on your own disk. Your
        dashboard keeps working through a WarmHawk outage or a network partition &mdash; there is no
        license server your instance depends on to stay up minute to minute.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        In practice this means a lapsed subscription locks the dashboard out naturally at its
        embedded expiry date, on the next daily check &mdash; not the instant a card is declined.
        That&rsquo;s deliberate: it avoids a jarring mid-session lockout over a same-day billing
        hiccup, while still guaranteeing access stops within about a day of a subscription actually
        ending.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Renewals: your license refreshes itself
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A monthly license carries about a month of expiry, and an annual one about a year. That
        expiry is baked in at issuance, so every renewal has to put a <em>new</em> token on your
        instance &mdash; which would be a monthly SSH session if you had to do it by hand. You
        don&rsquo;t.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Your dashboard checks in once a day, presents the token it already holds as proof of who it
        is, and gets back a freshly signed one as long as your subscription is still paying. In the
        normal case a renewal is invisible: the card charges, the next daily check picks up the new
        token, nobody touches a server.
      </p>
      <ul className="list-disc pl-6 space-y-3 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">To force it immediately</strong> &mdash; rather than waiting
          for the daily check &mdash; click <strong className="text-ink">Refresh license</strong>,
          on the expired-license screen and under{' '}
          <code className="font-mono">Settings &rarr; Billing</code>.
        </li>
        <li>
          <strong className="text-ink">An expired token still works to refresh with.</strong> That
          is the whole point: a locked-out dashboard is holding an expired token by definition, so
          being locked out never blocks you from recovering.
        </li>
        <li>
          <strong className="text-ink">If the subscription genuinely isn&rsquo;t paying</strong>,
          the refresh declines and tells you so, rather than silently reissuing. Fix the payment
          method in{' '}
          <Link href="/account/billing" className="text-rust font-semibold">
            billing
          </Link>
          , then refresh again.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Your tier and expiry are always re-read from Stripe at refresh time &mdash; never copied
        from the old token &mdash; so a refresh reflects what you&rsquo;re actually subscribed to
        today, including an upgrade or downgrade made since your last one.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">
        Paid, but the dashboard still shows unlicensed
      </h2>
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
          Check whether the webhook that issues the license was delivered and processed successfully
          &mdash; see{' '}
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
