import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'Security & Coordinated Disclosure Policy',
  description:
    "WarmHawk's coordinated disclosure policy: what's in scope, how to report a vulnerability, our response-time commitment, and safe-harbor terms for good-faith security researchers.",
  path: '/security',
});

export default function SecurityPage() {
  return (
    <>
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">Security</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            Coordinated disclosure policy
          </h1>
          <AnswerBlock>
            WarmHawk welcomes good-faith security research into the marketing site, the Stripe
            checkout/webhook path, and the open-core warmhawk-core-engine codebase. Report findings
            to {siteConfig.securityEmail} &mdash; confirmed issues get a response within 1 business
            day (4 hours if critical), and non-destructive, in-scope testing is covered by the
            safe-harbor terms below.
          </AnswerBlock>
          <p className="text-base leading-relaxed text-ink-muted">
            This page is the human-readable counterpart to{' '}
            <a href="/.well-known/security.txt" className="text-rust font-semibold">
              /.well-known/security.txt
            </a>{' '}
            (RFC 9116), which points machine readers at the same reporting address.
          </p>
        </div>
      </div>

      <div className="wrap pb-16 md:pb-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">Scope</h2>
          <p className="text-base leading-relaxed text-ink-muted mb-4">
            In scope for reports:
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex gap-3">
              <span className="text-rust font-semibold">&bull;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                <strong className="text-ink">The warmhawk.com marketing site</strong> &mdash; this
                site itself, including its forms and public-facing tools.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-rust font-semibold">&bull;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                <strong className="text-ink">The Stripe checkout/webhook path</strong> &mdash;
                Checkout Session creation, the Customer Portal integration, and the{' '}
                <code className="text-[13px] bg-cream-elevated px-1.5 py-0.5 rounded">
                  /api/stripe/webhook
                </code>{' '}
                signature-verification and license-issuance flow.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-rust font-semibold">&bull;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                <strong className="text-ink">The open-core warmhawk-core-engine codebase</strong>,
                once public &mdash; the sending, queueing, and API engine itself.
              </span>
            </li>
          </ul>
          <div className="card p-6 border-l-2 border-rust bg-cream-elevated">
            <p className="text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">A customer&rsquo;s own self-hosted deployment</strong> is
              generally that customer&rsquo;s own responsibility to patch and keep current via{' '}
              <code className="text-[13px] bg-cream px-1.5 py-0.5 rounded">warmhawk update</code>.
              That said, a genuine vulnerability in the product itself &mdash; found on a self-hosted
              instance but rooted in how WarmHawk ships &mdash; is still welcome and in scope. If
              you&rsquo;re unsure which bucket a finding falls into, report it anyway and we&rsquo;ll
              sort it out.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">
              How to report
            </h2>
            <p className="text-base leading-relaxed text-ink-muted mb-4">
              Email{' '}
              <a href={`mailto:${siteConfig.securityEmail}`} className="text-rust font-semibold">
                {siteConfig.securityEmail}
              </a>{' '}
              with as much detail as you can provide: the affected component, steps to reproduce,
              and the impact you believe it has. Screenshots, request/response captures, and a
              proof-of-concept (non-destructive only) all help us triage faster.
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">PGP key to be published before go-live.</strong> Until
              then, reports over plain email are fine &mdash; avoid including live credentials or
              customer data in the report itself.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap py-16 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">
            Response-time commitment
          </h2>
          <p className="text-base leading-relaxed text-ink-muted">
            Confirmed security issues get the same response-time commitment as Tier 1&rsquo;s
            support SLA:{' '}
            <strong className="text-ink">first response within 1 business day</strong>, or{' '}
            <strong className="text-ink">within 4 business hours for anything critical</strong>.
            We&rsquo;ll keep you updated as triage and a fix progress, and we&rsquo;ll credit your
            report (if you&rsquo;d like) once it&rsquo;s resolved.
          </p>
        </div>
      </div>

      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">
              Safe harbor
            </h2>
            <p className="text-base leading-relaxed text-ink-muted">
              WarmHawk will not pursue legal action against good-faith security researchers who
              test within the scope above, avoid destructive actions (no data deletion, no service
              disruption, no accessing another user&rsquo;s data beyond what&rsquo;s needed to
              demonstrate a finding), and report responsibly &mdash; privately, to{' '}
              {siteConfig.securityEmail}, giving us reasonable time to fix an issue before any
              public disclosure.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap py-16 md:py-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-4">
            Explicitly out of scope
          </h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-fail font-semibold">&times;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                Social engineering against WarmHawk staff (phishing, pretexting, or similar,
                targeting employees or contractors).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-fail font-semibold">&times;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                Physical security of any office, data center, or device.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-fail font-semibold">&times;</span>
              <span className="text-base leading-relaxed text-ink-muted">
                Denial-of-service testing against production infrastructure, including load
                testing without prior written permission.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
