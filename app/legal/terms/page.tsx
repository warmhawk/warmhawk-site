import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { DraftBanner } from '@/components/DraftBanner';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'Terms of Service',
  description:
    'The terms governing use of WarmHawk’s self-hosted cold email infrastructure software and any optional hosted billing services.',
  path: '/legal/terms',
});

const toc = [
  { id: 'acceptance', label: '1. Acceptance of terms' },
  { id: 'description', label: '2. Description of service' },
  { id: 'license-activation', label: '3. Account and license activation' },
  { id: 'billing', label: '4. Subscription billing' },
  { id: 'ip', label: '5. Intellectual property' },
  { id: 'warranties', label: '6. Disclaimer of warranties' },
  { id: 'liability', label: '7. Limitation of liability' },
  { id: 'termination', label: '8. Termination' },
  { id: 'changes', label: '9. Changes to these terms' },
  { id: 'governing-law', label: '10. Governing law' },
  { id: 'contact', label: '11. Contact' },
];

export default function TermsPage() {
  return (
    <>
      <DraftBanner />
      <div className="wrap py-16">
        <div className="label text-rust mb-5">Legal</div>
        <h1 className="font-display text-4xl font-semibold mb-4">Terms of Service</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: August 21, 2026</p>

        <p className="text-ink-muted leading-relaxed mb-4">
          This document is a draft, pending attorney review, and describes the terms under which
          WarmHawk LLC (&ldquo;WarmHawk,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) makes its cold-email infrastructure software and related services
          available to you (&ldquo;Customer,&rdquo; &ldquo;you&rdquo;). WarmHawk LLC is the
          operator of the WarmHawk product and the warmhawk.com website. By
          installing, activating a license for, or otherwise using WarmHawk, you agree to these
          Terms of Service (&ldquo;Terms&rdquo;).
        </p>

        <div className="card p-6 mb-10 bg-cream-elevated">
          <div className="label text-ink-muted mb-3">On this page</div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-rust font-semibold">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <h2 id="acceptance" className="font-display text-2xl font-semibold mb-3 mt-10">
          1. Acceptance of terms
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          These Terms form a binding agreement between you and WarmHawk. You must accept these
          Terms, together with the{' '}
          <Link href="/legal/privacy" className="text-rust font-semibold">
            Privacy Policy
          </Link>{' '}
          and the{' '}
          <Link href="/legal/acceptable-use" className="text-rust font-semibold">
            Acceptable Use Policy
          </Link>{' '}
          (&ldquo;AUP&rdquo;), before your license can be activated. If you do not agree to all
          three documents, you may not activate a license or use WarmHawk. If you are accepting on
          behalf of an organization, you represent that you have authority to bind that
          organization.
        </p>

        <h2 id="description" className="font-display text-2xl font-semibold mb-3 mt-10">
          2. Description of service
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk is, at its core, a self-hosted software product. You deploy it on infrastructure
          you own or control (your own server, containers, database, and TLS certificate), and it
          runs there for the life of your license. WarmHawk LLC separately operates:
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>the warmhawk.com marketing site and documentation you are reading now;</li>
          <li>
            an optional hosted billing and license-management path, used to process your
            subscription payment and issue the license key your self-hosted instance activates
            against; and
          </li>
          <li>
            an optional, separately-priced Enterprise &ldquo;done-for-you&rdquo; provisioning
            service, under which WarmHawk personnel configure and maintain dedicated
            infrastructure on your behalf.
          </li>
        </ul>
        <p className="text-ink-muted leading-relaxed mb-4">
          Except where you have purchased the Enterprise done-for-you tier, WarmHawk does not
          operate, host, or have standing access to the server your instance runs on.
        </p>

        <h2 id="license-activation" className="font-display text-2xl font-semibold mb-3 mt-10">
          3. Account and license activation
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          A WarmHawk license is issued once you complete checkout and is activated during the
          self-hosted install flow (the <code>--license</code> flag passed to the install script).
          As part of that install flow, you must affirmatively accept these Terms, the Privacy
          Policy, and the AUP together before the license key will validate and unlock the
          software. Refusing any one of the three documents will cause activation to fail; there is
          no way to activate a license while accepting only part of this bundle.
        </p>
        <p className="text-ink-muted leading-relaxed mb-4">
          You are responsible for keeping your license key confidential and for all activity that
          occurs under your account, including actions taken by team members you invite (see the
          AUP&rsquo;s team-access provisions).
        </p>

        <h2 id="billing" className="font-display text-2xl font-semibold mb-3 mt-10">
          4. Subscription billing
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Paid tiers are billed through Stripe, our payment processor, on a monthly or annual
          subscription that renews automatically at the then-current rate until cancelled. You
          authorize WarmHawk to charge your payment method on file for each renewal period.
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>
            <strong>Money-back guarantee:</strong> the Self-Hosted Pro (Tier&nbsp;1) subscription
            carries a 30-day money-back guarantee from the date of your first charge. Contact{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
              {siteConfig.supportEmail}
            </a>{' '}
            within that window for a full refund of that charge.
          </li>
          <li>
            <strong>Cancellation:</strong> you may cancel auto-renewal at any time through the
            Stripe Customer Portal, accessible from your dashboard. Cancellation takes effect at
            the end of the then-current billing period; we do not prorate mid-period refunds
            outside the Tier&nbsp;1 guarantee window above.
          </li>
          <li>
            <strong>Price changes:</strong> we will give reasonable advance notice by email before
            any price increase takes effect on your next renewal.
          </li>
        </ul>

        <h2 id="ip" className="font-display text-2xl font-semibold mb-3 mt-10">
          5. Intellectual property
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk&rsquo;s core sending engine is open-core, source-available software licensed
          under the Business Source License (BSL). Subject to the BSL&rsquo;s terms, you may run,
          modify, and self-host the engine for your own use. On the BSL&rsquo;s stated Change Date
          &mdash; four years from each version&rsquo;s release &mdash; that version automatically
          converts to the Apache License, Version 2.0. Nothing in this section grants rights to
          resell or offer the engine as a competing hosted service before its Change Date, as
          restricted by the BSL text shipped with the software.
        </p>
        <p className="text-ink-muted leading-relaxed mb-4">
          The enterprise dashboard, license-management layer, and any WarmHawk branding, trademarks,
          and documentation are proprietary to WarmHawk and are licensed to you, not sold, solely
          for use in connection with an active subscription. All rights not expressly granted are
          reserved.
        </p>

        <h2 id="warranties" className="font-display text-2xl font-semibold mb-3 mt-10">
          6. Disclaimer of warranties
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, whether express, implied, or statutory, including implied
          warranties of merchantability, fitness for a particular purpose, and non-infringement. We
          do not warrant that the software will be uninterrupted, error-free, or that any
          particular deliverability, inbox-placement, or sending outcome will be achieved, since
          your own server, sending domains, and content practices materially affect those outcomes.
        </p>

        <h2 id="liability" className="font-display text-2xl font-semibold mb-3 mt-10">
          7. Limitation of liability
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          To the maximum extent permitted by law, WarmHawk and its officers, employees, and
          contractors will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for lost profits, revenue, data, or goodwill, arising from your use
          of or inability to use WarmHawk, even if advised of the possibility of such damages.
          WarmHawk&rsquo;s total aggregate liability for any claim arising out of these Terms will
          not exceed the amount you paid WarmHawk in the twelve (12) months preceding the event
          giving rise to the claim.
        </p>

        <h2 id="termination" className="font-display text-2xl font-semibold mb-3 mt-10">
          8. Termination
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          You may cancel your subscription at any time as described in Section&nbsp;4. We may
          suspend or terminate your license if you materially breach these Terms, the AUP, or the
          Privacy Policy, including for the AUP violations described on that page, with no
          obligation to issue a refund where termination follows an AUP violation. On termination,
          your right to receive license updates and hosted billing services ends; because WarmHawk
          is self-hosted, a previously-installed instance and any data stored on your own server
          are not remotely disabled or deleted by us.
        </p>

        <h2 id="changes" className="font-display text-2xl font-semibold mb-3 mt-10">
          9. Changes to these terms
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          We may update these Terms from time to time. We will post the revised Terms at this URL
          with an updated &ldquo;Last updated&rdquo; date and, for material changes, will make
          reasonable efforts to notify active subscribers by email. Continued use of WarmHawk after
          a change takes effect constitutes acceptance of the revised Terms.
        </p>

        <h2 id="governing-law" className="font-display text-2xl font-semibold mb-3 mt-10">
          10. Governing law
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          These Terms are governed by applicable law. These Terms do not designate a specific
          state or country&rsquo;s law as controlling; a governing-law determination, if one
          becomes necessary, will be made under standard conflict-of-laws principles at that
          time.
        </p>

        <h2 id="contact" className="font-display text-2xl font-semibold mb-3 mt-10">
          11. Contact
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Questions about these Terms can be sent to{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      </div>
    </>
  );
}
