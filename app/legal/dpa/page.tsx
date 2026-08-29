import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { DraftBanner } from '@/components/DraftBanner';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'Data Processing Agreement',
  description:
    'How WarmHawk processes personal data as a processor for the billing/checkout flow only — short by design, because customer lead and campaign data never leaves the customer’s own self-hosted server.',
  path: '/legal/dpa',
});

const toc = [
  { id: 'scope-note', label: '1. Why this DPA is short' },
  { id: 'definitions', label: '2. Definitions' },
  { id: 'subject-matter', label: '3. Subject matter and duration' },
  { id: 'nature-purpose', label: '4. Nature and purpose of processing' },
  { id: 'data-subjects', label: '5. Categories of data subjects and data' },
  { id: 'sub-processors', label: '6. Sub-processors' },
  { id: 'security', label: '7. Security measures' },
  { id: 'international-transfers', label: '8. International transfers' },
  { id: 'data-subject-rights', label: '9. Data subject rights assistance' },
  { id: 'audit-rights', label: '10. Audit rights' },
  { id: 'term', label: '11. Term and termination' },
  { id: 'contact', label: '12. Contact' },
];

export default function DpaPage() {
  return (
    <>
      <DraftBanner />
      <div className="wrap py-16">
        <div className="label text-rust mb-5">Legal</div>
        <h1 className="font-display text-4xl font-semibold mb-4">Data Processing Agreement</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: August 21, 2026</p>

        <p className="text-ink-muted leading-relaxed mb-4">
          This document is a draft, pending attorney review. It describes how WarmHawk LLC
          (&ldquo;WarmHawk,&rdquo; &ldquo;we,&rdquo; &ldquo;Processor&rdquo;), the operator of
          warmhawk.com and its billing/checkout flow, processes personal data as a processor on
          behalf of a customer (&ldquo;Customer,&rdquo; &ldquo;Controller&rdquo;), for organizations
          whose procurement process requires a standalone DPA. It is linked from the checkout flow
          for exactly that reason.
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

        <h2 id="scope-note" className="font-display text-2xl font-semibold mb-3 mt-10">
          1. Why this DPA is short
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          A typical SaaS DPA is long because the vendor stores and processes the customer&rsquo;s
          end-user data on the vendor&rsquo;s own infrastructure. WarmHawk&rsquo;s architecture is
          the opposite: the product is fully self-hosted, running on Customer&rsquo;s own server,
          own Postgres database, and own containers. As a direct consequence, WarmHawk itself never
          touches Customer&rsquo;s lead, prospect, or campaign data at rest, in transit through
          WarmHawk&rsquo;s systems, or in any backup WarmHawk holds. This DPA is intentionally short
          relative to a typical SaaS DPA &mdash; it covers only the narrow slice of personal data
          that does reach WarmHawk&rsquo;s systems: billing and checkout data processed through
          Stripe.
        </p>

        <h2 id="definitions" className="font-display text-2xl font-semibold mb-3 mt-10">
          2. Definitions
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Terms used in this DPA &mdash; &ldquo;controller,&rdquo; &ldquo;processor,&rdquo;
          &ldquo;data subject,&rdquo; &ldquo;personal data,&rdquo; &ldquo;processing,&rdquo; and
          &ldquo;sub-processor&rdquo; &mdash; have the meanings given in Article&nbsp;4 of the GDPR.
          In summary: Customer is the <strong>controller</strong> of its own lead and campaign data,
          deciding why and how that data is processed; WarmHawk is the <strong>processor</strong>{' '}
          only for the narrow billing-contact data described in Section&nbsp;5, processing it solely
          on Customer&rsquo;s instructions to deliver the subscription Customer purchased.
        </p>

        <h2 id="subject-matter" className="font-display text-2xl font-semibold mb-3 mt-10">
          3. Subject matter and duration
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          The subject matter of processing under this DPA is the billing-contact personal data
          submitted through the warmhawk.com checkout flow. Processing continues for the duration of
          Customer&rsquo;s active subscription and for any retention period required afterward by
          tax, accounting, or other applicable law, consistent with the{' '}
          <Link href="/legal/privacy" className="text-rust font-semibold">
            Privacy Policy
          </Link>
          .
        </p>

        <h2 id="nature-purpose" className="font-display text-2xl font-semibold mb-3 mt-10">
          4. Nature and purpose of processing
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          The marketing site&rsquo;s billing/checkout flow processes payment and contact data (name,
          email, billing address, payment method) via Stripe as a sub-processor, solely to complete
          Customer&rsquo;s purchase, issue a license key, and administer the subscription. This DPA
          does <strong>not</strong> cover, and does not need to cover, Customer&rsquo;s lead lists,
          mailbox contents, or campaign data &mdash; that data is generated, stored, and processed
          entirely within Customer&rsquo;s own self-hosted instance and never reaches any system
          WarmHawk operates.
        </p>

        <h2 id="data-subjects" className="font-display text-2xl font-semibold mb-3 mt-10">
          5. Categories of data subjects and data
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          The only data subjects in scope of this DPA are Customer&rsquo;s billing contacts &mdash;
          typically the individual who completes checkout on Customer&rsquo;s behalf. The only
          categories of data in scope are ordinary billing-contact details: name, business email
          address, billing address, and payment-method metadata handled by Stripe. No special
          categories of data (GDPR Art.&nbsp;9) are knowingly processed under this DPA.
        </p>

        <h2 id="sub-processors" className="font-display text-2xl font-semibold mb-3 mt-10">
          6. Sub-processors
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk engages <strong>Stripe, Inc.</strong> as its sole sub-processor for the
          processing described in this DPA, to handle payment processing and subscription billing.
          We will provide reasonable advance notice before adding or replacing a sub-processor for
          this billing-contact data.
        </p>

        <h2 id="security" className="font-display text-2xl font-semibold mb-3 mt-10">
          7. Security measures
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          All traffic between Customer, warmhawk.com, and Stripe is encrypted in transit via TLS.
          Because Customer&rsquo;s lead and campaign data is never transmitted to or stored by
          WarmHawk, the largest data-security risk present in a typical SaaS deployment &mdash; a
          vendor-side breach of end-user data &mdash; does not apply to this architecture; that data
          exists only on infrastructure Customer itself controls and secures.
        </p>

        <h2 id="international-transfers" className="font-display text-2xl font-semibold mb-3 mt-10">
          8. International transfers
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Where Stripe processes billing-contact data outside the EU/EEA, such transfers rely on
          Stripe&rsquo;s own Standard Contractual Clauses and equivalent safeguards. This section is
          a placeholder pending counsel review of the specific transfer mechanism in effect at the
          time Customer executes this DPA.
        </p>

        <h2 id="data-subject-rights" className="font-display text-2xl font-semibold mb-3 mt-10">
          9. Data subject rights assistance
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          WarmHawk will provide Customer with reasonable assistance to respond to a data subject
          access, correction, deletion, or portability request concerning billing-contact data
          processed under this DPA. Requests can be directed to{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
            {siteConfig.supportEmail}
          </a>
          . WarmHawk has no ability to fulfill a request concerning Customer&rsquo;s lead or
          campaign data, since that data never reaches WarmHawk&rsquo;s systems; such requests must
          be handled by Customer directly on its own self-hosted instance.
        </p>

        <h2 id="audit-rights" className="font-display text-2xl font-semibold mb-3 mt-10">
          10. Audit rights
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          On reasonable written request, no more than once per 12-month period, WarmHawk will make
          available information reasonably necessary to demonstrate compliance with this DPA with
          respect to the billing-contact processing described above, which may include a summary of
          Stripe&rsquo;s own compliance documentation in lieu of an on-site audit.
        </p>

        <h2 id="term" className="font-display text-2xl font-semibold mb-3 mt-10">
          11. Term and termination
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          This DPA takes effect when Customer accepts it (or, if not separately executed, upon
          Customer&rsquo;s acceptance of the{' '}
          <Link href="/legal/terms" className="text-rust font-semibold">
            Terms of Service
          </Link>
          ) and remains in effect for as long as the Terms of Service remain in effect, terminating
          automatically alongside them. This DPA is governed by applicable law, with no specific
          state or country designated as controlling — the same governing-law approach used in the
          Terms of Service.
        </p>

        <h2 id="contact" className="font-display text-2xl font-semibold mb-3 mt-10">
          12. Contact
        </h2>
        <p className="text-ink-muted leading-relaxed mb-4">
          Questions about this DPA can be sent to{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-rust font-semibold">
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      </div>
    </>
  );
}
