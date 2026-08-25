import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { DraftBanner } from '@/components/DraftBanner';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'Acceptable Use Policy',
  description:
    'What is prohibited when sending mail through a self-hosted WarmHawk instance: consent-less lists, phishing or fraud, sender-identity impersonation, and illegal content — plus CAN-SPAM, suppression-list, and BYOK AI expectations.',
  path: '/legal/acceptable-use',
});

const toc = [
  { id: 'prohibited-uses', label: '1. Prohibited uses' },
  { id: 'can-spam', label: '2. CAN-SPAM compliance' },
  { id: 'suppression-lists', label: '3. Suppression lists are a hard floor' },
  { id: 'byok-ai', label: '4. BYOK AI content' },
  { id: 'team-access', label: '5. Team member access' },
  { id: 'consequences', label: '6. Consequences of violation' },
  { id: 'related-documents', label: '7. Related documents' },
  { id: 'contact', label: '8. Contact' },
];

export default function AcceptableUsePage() {
  return (
    <>
      <DraftBanner />
      <div className="wrap py-16">
        <div className="label text-rust mb-5">Legal</div>
        <h1 className="font-display text-4xl font-semibold mb-4">Acceptable Use Policy</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: August 21, 2026</p>

        <p className="text-ink-muted leading-relaxed mb-4">
          This document is a draft, pending attorney review. It sets out what you may and may not
          do when sending mail through a WarmHawk instance operated by WarmHawk LLC
          (&ldquo;WarmHawk,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). You must accept this
          Acceptable Use
          Policy (&ldquo;AUP&rdquo;), together with the{' '}
          <Link href="/legal/terms" className="text-rust font-semibold">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-rust font-semibold">
            Privacy Policy
          </Link>
          , before your license can be activated, and it applies for as long as you run WarmHawk
          under a license we issued.
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

        <h2 id="prohibited-uses" className="font-display text-2xl font-semibold mb-3 mt-10">
          1. Prohibited uses
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          You may not use WarmHawk, or any instance running under a WarmHawk license, to do any of
          the following. These four prohibitions are absolute and are not subject to a
          customer&rsquo;s own risk tolerance:
        </p>
        <ol className="list-decimal pl-6 mb-4 text-ink-muted leading-relaxed space-y-3">
          <li>
            <strong>Purchased, scraped, or otherwise consent-less B2C lists.</strong> Sending to
            consumer (B2C) recipients who did not provide some affirmative basis for contact
            &mdash; including lists that were bought, scraped from the web, or otherwise assembled
            without the recipient&rsquo;s knowledge &mdash; is prohibited outright, regardless of
            jurisdiction.
          </li>
          <li>
            <strong>Phishing or fraud, of any kind.</strong> Any message designed to deceive a
            recipient into revealing credentials, financial information, or other sensitive data,
            or designed to induce a fraudulent payment or action, is prohibited.
          </li>
          <li>
            <strong>Sender-identity impersonation.</strong> Spoofing the identity of another
            person, brand, or organization &mdash; sending as if you were them without
            authorization &mdash; is prohibited.
          </li>
          <li>
            <strong>Illegal content.</strong> Sending any content that is illegal under applicable
            law is prohibited.
          </li>
        </ol>

        <h2 id="can-spam" className="font-display text-2xl font-semibold mb-3 mt-10">
          2. CAN-SPAM compliance
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          You are the sender of record for mail sent through your own instance, and you are
          responsible for that mail&rsquo;s compliance with CAN-SPAM and equivalent laws in the
          jurisdictions you send to. At minimum, every campaign you run must:
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>include a valid, physical mailing address in the message;</li>
          <li>
            include a functioning, clearly presented unsubscribe mechanism in every commercial
            message; and
          </li>
          <li>
            honor an opt-out or unsubscribe request promptly, and not re-add that recipient to a
            future send.
          </li>
        </ul>

        <h2 id="suppression-lists" className="font-display text-2xl font-semibold mb-3 mt-10">
          3. Suppression lists are a hard floor
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk&rsquo;s built-in suppression-list mechanism &mdash; which blocks further sends to
          recipients who have unsubscribed, bounced, or complained &mdash; is a hard floor, not a
          configurable default. You may not disable it, bypass it, or re-import a suppressed
          recipient back into an active send list.
        </p>

        <h2 id="byok-ai" className="font-display text-2xl font-semibold mb-3 mt-10">
          4. BYOK AI content
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Where you enable AI-assisted personalization, you connect your own API key
          (&ldquo;BYOK&rdquo;) for Google Gemini or Anthropic Claude, and that generation happens
          directly between your instance and your chosen provider. WarmHawk never stores, reviews,
          or has visibility into the AI-generated copy your instance produces. That relationship,
          and the content it produces, is between you and your AI provider &mdash; you remain
          responsible for complying with Anthropic&rsquo;s and Google&rsquo;s own usage policies for
          any content you generate through their models, independent of your obligations under this
          AUP.
        </p>

        <h2 id="team-access" className="font-display text-2xl font-semibold mb-3 mt-10">
          5. Team member access
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          As of this writing, WarmHawk uses a flat permission model: every team member you invite to
          your instance has full access to mailbox credentials, campaign data, and billing
          settings. There is no per-role or restricted-access tier available at launch. The account
          owner is solely responsible for deciding who to invite, and for any action a team member
          takes with that full access, including a violation of Section&nbsp;1 of this AUP.
        </p>

        <h2 id="consequences" className="font-display text-2xl font-semibold mb-3 mt-10">
          6. Consequences of violation
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          If we determine, in our discretion, that your use of WarmHawk violates this AUP, we may
          suspend or terminate your license without notice. Where we find a violation of this
          policy, we have no obligation to issue a refund of any amount already paid, including
          under the Tier&nbsp;1 money-back guarantee described in the Terms of Service.
        </p>

        <h2 id="related-documents" className="font-display text-2xl font-semibold mb-3 mt-10">
          7. Related documents
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          This AUP works together with, and does not replace, the{' '}
          <Link href="/legal/terms" className="text-rust font-semibold">
            Terms of Service
          </Link>{' '}
          and the{' '}
          <Link href="/legal/dpa" className="text-rust font-semibold">
            Data Processing Agreement
          </Link>
          . Where this AUP is silent, the Terms of Service govern.
        </p>

        <h2 id="contact" className="font-display text-2xl font-semibold mb-3 mt-10">
          8. Contact
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          To report suspected abuse or a violation of this policy, email{' '}
          <a href={`mailto:${siteConfig.securityEmail}`} className="text-rust font-semibold">
            {siteConfig.securityEmail}
          </a>
          . For general questions about this AUP, email{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
            {siteConfig.supportEmail}
          </a>
          .
        </p>
        <p className="text-ink-muted leading-relaxed mb-4">
          This policy is governed by the same law as the{' '}
          <Link href="/legal/terms#governing-law" className="text-rust font-semibold">
            Terms of Service
          </Link>
          : applicable law, with no specific state or country designated as controlling —
          the same governing-law approach used in the Terms of Service above.
        </p>
      </div>
    </>
  );
}
