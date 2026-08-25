import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CheckBadge } from '@/components/CheckBadge';
import { getStatusChecks } from '@/lib/statusProvider';

export const metadata: Metadata = pageSeo({
  title: 'Status',
  description:
    "What WarmHawk operates centrally (the marketing site and Stripe license issuance) versus what runs on your own self-hosted instance, monitored by your own bundled Uptime Kuma and OTEL export.",
  path: '/status',
});

// Revalidate periodically rather than on every request or only at build
// time — a real status provider's data is worth refreshing, but this page
// doesn't need to be fully dynamic (per-request) to do that.
export const revalidate = 300;

export default async function StatusPage() {
  const checks = await getStatusChecks();
  const marketingSite = checks.find((check) => check.key === 'marketing-site');
  const stripeWebhook = checks.find((check) => check.key === 'stripe-webhook');
  const isUnconfigured = checks.some((check) => check.status === 'unconfigured');

  return (
    <>
      <div className="wrap pt-16 md:pt-24 pb-10">
        <div className="max-w-3xl">
          <div className="label text-rust mb-5">Status</div>
          <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6">
            What&rsquo;s centrally operated, and what isn&rsquo;t
          </h1>
          <AnswerBlock>
            WarmHawk centrally operates exactly two things: this marketing site and the Stripe
            webhook that issues licenses. Your self-hosted instance &mdash; containers, nginx,
            TLS, Postgres &mdash; is entirely yours to run, which is the whole point of a
            self-hosted product. You get your own bundled Uptime Kuma and a free OTEL export
            endpoint to monitor it yourself.
          </AnswerBlock>
        </div>
      </div>

      {/* WHAT WARMHAWK OPERATES CENTRALLY */}
      <div className="wrap pb-16 md:pb-20">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-3">
            What WarmHawk operates centrally
          </h2>
          <p className="text-base leading-relaxed text-ink-muted mb-6">
            Two things, and only two things, run on infrastructure WarmHawk itself controls.
            Everything else &mdash; every customer&rsquo;s actual sending engine, dashboard,
            database, and mail delivery &mdash; runs on that customer&rsquo;s own server instead.
          </p>

          <div className="card divide-y divide-border">
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="font-semibold text-[15px]">Marketing site</div>
                <div className="text-sm text-ink-muted mt-0.5">warmhawk.com itself</div>
              </div>
              <CheckBadge status={marketingSite?.status ?? 'unconfigured'} />
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="font-semibold text-[15px]">Stripe webhook / license issuance</div>
                <div className="text-sm text-ink-muted mt-0.5">
                  Checkout &rarr; webhook &rarr; license-key delivery path
                </div>
              </div>
              <CheckBadge status={stripeWebhook?.status ?? 'unconfigured'} />
            </div>
          </div>
          {isUnconfigured && (
            <p className="text-sm leading-relaxed text-ink-muted mt-4">
              Live status monitoring isn&rsquo;t configured yet &mdash; these two rows will report
              real, provider-backed status once{' '}
              <code className="text-[13px] bg-cream px-1.5 py-0.5 rounded">
                STATUS_KUMA_BASE_URL
              </code>{' '}
              and{' '}
              <code className="text-[13px] bg-cream px-1.5 py-0.5 rounded">STATUS_KUMA_SLUG</code>{' '}
              are set.
            </p>
          )}
        </div>
      </div>

      {/* YOUR OWN INSTANCE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl md:text-[28px] font-semibold mb-3">
              Your own instance
            </h2>
            <p className="text-base leading-relaxed text-ink-muted mb-4">
              WarmHawk does not operate, and does not report uptime on, any customer&rsquo;s own
              self-hosted deployment. Your containers, your nginx, your TLS certificate, your
              Postgres database &mdash; none of it runs on WarmHawk-controlled infrastructure, so
              there is no central status WarmHawk could honestly report on your behalf. That
              separation is the entire point of a self-hosted product: your instance&rsquo;s
              uptime is exactly as good as the server you run it on, not tied to WarmHawk&rsquo;s.
            </p>
            <p className="text-base leading-relaxed text-ink-muted mb-4">
              Instead, every install gets its own visibility built in, on by default:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-rust font-semibold">&bull;</span>
                <span className="text-base leading-relaxed text-ink-muted">
                  <strong className="text-ink">A bundled Uptime Kuma instance</strong>, installed
                  automatically by{' '}
                  <code className="text-[13px] bg-cream px-1.5 py-0.5 rounded">install.sh</code>,
                  giving you real-time, 1-minute-interval health checks across every service on
                  your own instance &mdash; visible only to you.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-rust font-semibold">&bull;</span>
                <span className="text-base leading-relaxed text-ink-muted">
                  <strong className="text-ink">A free, native OTEL export endpoint</strong> you can
                  point at whatever deeper observability tooling you already use &mdash; Grafana,
                  SigNoz, Honeycomb, or anything else that speaks OTLP &mdash; if you want more than
                  Uptime Kuma&rsquo;s dashboard gives you.
                </span>
              </li>
            </ul>
            <p className="text-base leading-relaxed text-ink-muted mt-4">
              For backup/restore procedures and troubleshooting a self-hosted instance, see the{' '}
              <Link href="/docs" className="text-rust font-semibold">
                docs
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
