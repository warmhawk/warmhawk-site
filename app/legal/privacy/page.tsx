import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { DraftBanner } from '@/components/DraftBanner';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'Privacy Policy',
  description:
    'What WarmHawk collects on the marketing site and billing path — and the customer lead, mailbox, and campaign data WarmHawk never has access to, because the product is fully self-hosted.',
  path: '/legal/privacy',
});

const toc = [
  { id: 'what-we-collect', label: '1. What we collect' },
  { id: 'what-we-dont-collect', label: '2. What we do not collect' },
  { id: 'gdpr-basis', label: '3. Legal basis for processing (GDPR)' },
  { id: 'retention', label: '4. Data retention' },
  { id: 'your-rights', label: '5. Your rights' },
  { id: 'processors', label: '6. Third-party processors' },
  { id: 'cookies', label: '7. Cookies' },
  { id: 'children', label: '8. Children’s privacy' },
  { id: 'changes', label: '9. Changes to this policy' },
  { id: 'contact', label: '10. Contact' },
];

export default function PrivacyPage() {
  return (
    <>
      <DraftBanner />
      <div className="wrap py-16">
        <div className="label text-rust mb-5">Legal</div>
        <h1 className="font-display text-4xl font-semibold mb-4">Privacy Policy</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: August 21, 2026</p>

        <p className="text-ink-muted leading-relaxed mb-4">
          This document is a draft, pending attorney review. It describes the personal data
          practices of WarmHawk LLC (&ldquo;WarmHawk,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;), the operator of warmhawk.com and the WarmHawk billing path, with
          respect to visitors to our marketing site and customers who purchase a subscription.
          Because WarmHawk&rsquo;s product is fully self-hosted, this policy is intentionally
          narrow in scope &mdash; see Section&nbsp;2 for what falls entirely outside it.
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

        <h2 id="what-we-collect" className="font-display text-2xl font-semibold mb-3 mt-10">
          1. What we collect
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk-the-company collects only what is needed to operate the marketing site and the
          optional hosted billing path:
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>
            <strong>Site analytics:</strong> basic, aggregate traffic data about pages viewed on
            warmhawk.com (for example, referrer and page-path counts), used only to understand
            which pages are useful. We do not build cross-site advertising profiles from this data.
          </li>
          <li>
            <strong>Checkout and billing data:</strong> when you purchase a subscription, Stripe
            collects your name, email, billing address, and payment details on our behalf to
            process the charge and issue your license key. See Section&nbsp;6.
          </li>
          <li>
            <strong>Support correspondence:</strong> if you email {siteConfig.supportEmail} or{' '}
            {siteConfig.securityEmail}, we keep that correspondence to respond to you and to
            maintain a support history.
          </li>
        </ul>

        <h2 id="what-we-dont-collect" className="font-display text-2xl font-semibold mb-3 mt-10">
          2. What we do not collect
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk&rsquo;s product runs entirely on infrastructure you own and control &mdash; your
          own server, your own containers, your own Postgres database. As a direct result of that
          architecture, WarmHawk never collects, transmits to itself, or has access to, at rest:
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>your prospect or customer lead lists;</li>
          <li>your mailbox credentials or connected email account contents;</li>
          <li>
            the content of any campaign, sequence, or AI-generated copy you send through your own
            instance; or
          </li>
          <li>
            any deliverability, reply, or reputation data your instance records about your sending
            domains.
          </li>
        </ul>
        <p className="text-ink-muted leading-relaxed mb-4">
          That data lives exclusively on your own server, under your own control, for the life of
          your installation. WarmHawk has no standing access path into it and no copy of it exists
          on WarmHawk-operated systems.
        </p>

        <h2 id="gdpr-basis" className="font-display text-2xl font-semibold mb-3 mt-10">
          3. Legal basis for processing (GDPR)
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Where personal data of individuals in the EU/EEA is processed under this policy (for
          example, a billing contact&rsquo;s name and email), we rely on:
        </p>
        <ul className="list-disc pl-6 mb-4 text-ink-muted leading-relaxed space-y-1.5">
          <li>
            <strong>Performance of a contract</strong> (GDPR Art. 6(1)(b)) &mdash; to process your
            subscription payment and deliver the service you purchased; and
          </li>
          <li>
            <strong>Legitimate interest</strong> (GDPR Art. 6(1)(f)) &mdash; to maintain basic site
            analytics and respond to support correspondence, which we consider proportionate given
            the minimal, non-invasive data involved.
          </li>
        </ul>

        <h2 id="retention" className="font-display text-2xl font-semibold mb-3 mt-10">
          4. Data retention
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Billing records are retained for as long as required by tax and accounting law after your
          subscription ends. Support correspondence is retained for a reasonable period to maintain
          service history, then deleted or anonymized. Aggregate site analytics are retained in
          summarized form and are not tied to an identifiable individual beyond a short rolling
          window.
        </p>

        <h2 id="your-rights" className="font-display text-2xl font-semibold mb-3 mt-10">
          5. Your rights
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Depending on your location, you may have the right to access, correct, delete, or receive
          a portable copy of the personal data we hold about you (billing and support data, as
          scoped above &mdash; this does not extend to data stored solely on your own self-hosted
          instance, which we cannot access). To exercise any of these rights, email{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
            {siteConfig.supportEmail}
          </a>{' '}
          and we will respond within a reasonable time.
        </p>

        <h2 id="processors" className="font-display text-2xl font-semibold mb-3 mt-10">
          6. Third-party processors
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          We use <strong>Stripe, Inc.</strong> as our payment processor and sub-processor for all
          checkout, subscription billing, and payment-method storage. Stripe processes this data
          under its own privacy policy and applicable data protection agreements. We do not share
          billing data with any other third party for marketing purposes. See the{' '}
          <Link href="/legal/dpa" className="text-rust font-semibold">
            Data Processing Agreement
          </Link>{' '}
          for the deeper processor and data-flow detail relevant to EU procurement review.
        </p>

        <h2 id="cookies" className="font-display text-2xl font-semibold mb-3 mt-10">
          7. Cookies
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Consistent with WarmHawk&rsquo;s &ldquo;no shared infrastructure, no third-party
          leaks&rdquo; positioning, we keep cookie use to a minimum: essential cookies required for
          the checkout flow to function, and, where enabled, a privacy-respecting analytics cookie
          used only for the aggregate site metrics described in Section&nbsp;1. We do not run
          invasive cross-site advertising trackers on warmhawk.com.
        </p>

        <h2 id="children" className="font-display text-2xl font-semibold mb-3 mt-10">
          8. Children&rsquo;s privacy
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk is a B2B infrastructure product not directed at children, and we do not
          knowingly collect personal data from anyone under 16. If you believe a child has provided
          us personal data, contact us at {siteConfig.supportEmail} and we will delete it.
        </p>

        <h2 id="changes" className="font-display text-2xl font-semibold mb-3 mt-10">
          9. Changes to this policy
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          We may update this policy from time to time. We will post the revised policy at this URL
          with an updated &ldquo;Last updated&rdquo; date and, for material changes, will make
          reasonable efforts to notify active subscribers by email.
        </p>

        <h2 id="contact" className="font-display text-2xl font-semibold mb-3 mt-10">
          10. Contact
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Questions about this Privacy Policy, or a request under Section&nbsp;5, can be sent to{' '}
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
