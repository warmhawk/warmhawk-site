import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { BillingPortalForm } from '@/components/BillingPortalForm';

export const metadata: Metadata = pageSeo({
  title: 'Manage your billing',
  description:
    'Open the Stripe Customer Portal for your WarmHawk subscription — update your card, download invoices, switch monthly ⇄ annual, or cancel. Authenticated with your license token.',
  path: '/account/billing',
});

// Closes 2026-08-30 go-live audit finding T2. warmhawk-enterprise-operator sends customers here
// from three places — LicenseGate's expired-license screen ("Manage billing"), the in-dashboard
// billing settings page, and the dashboard's own support copy — and this route did not exist, so
// all three 404'd. The expired-license screen is the worst of the three: a locked-out customer
// actively trying to pay was the one most likely to click it.
//
// Deliberately not indexed: it is an account-management destination for existing customers, not a
// marketing page, and it has nothing to rank for.
export const robots = { index: false, follow: false };

interface BillingPageProps {
  // Next.js 15+: searchParams is a Promise (Async Request APIs) — same treatment as
  // app/checkout/page.tsx.
  searchParams: Promise<{ token?: string }>;
}

export default async function AccountBillingPage({ searchParams }: BillingPageProps) {
  const resolved = await searchParams;

  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Account / Billing</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-2xl">
        Manage your subscription.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-10">
        WarmHawk runs on your server, but billing runs through Stripe. Paste your license token to
        open your Customer Portal — no account to create, no password to remember.
      </p>

      <div className="grid md:grid-cols-[1.1fr_.9fr] gap-8 items-start">
        <BillingPortalForm initialToken={resolved?.token ?? ''} />

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold mb-3">Can&rsquo;t find your token?</h2>
          <p className="text-sm leading-relaxed text-ink-muted mb-4">
            It was emailed to you at purchase, with the subject{' '}
            <em>&ldquo;Your WarmHawk install command.&rdquo;</em> It&rsquo;s also on your own
            server, in <code className="font-mono">.env</code> as{' '}
            <code className="font-mono">WARMHAWK_LICENSE_KEY</code>:
          </p>
          <pre className="bg-cream-elevated border border-border rounded-lg p-3 text-[12px] font-mono overflow-x-auto mb-4">
            grep WARMHAWK_LICENSE_KEY ~/warmhawk/warmhawk-enterprise-operator/.env
          </pre>
          <p className="text-sm leading-relaxed text-ink-muted mb-4">
            If it&rsquo;s genuinely gone, email{' '}
            <a href="mailto:support@warmhawk.com" className="text-rust font-semibold">
              support@warmhawk.com
            </a>{' '}
            from the address you purchased with and we&rsquo;ll re-send it — every issued license is
            recorded against your Stripe subscription, so nothing is ever lost.
          </p>
          <p className="text-sm leading-relaxed text-ink-muted">
            Not a customer yet?{' '}
            <Link href="/compare/pricing" className="text-rust font-semibold">
              See pricing
            </Link>{' '}
            or{' '}
            <Link href="/docs/quickstart" className="text-rust font-semibold">
              run the free engine
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
