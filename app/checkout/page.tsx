import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { CheckoutTabs } from '@/components/CheckoutTabs';

export const metadata: Metadata = pageSeo({
  title: 'Checkout',
  description:
    'Start Tier 1 (Self-Hosted Pro, $199/mo) or Tier 2 (Enterprise DFY, $1,999 one-time setup fee plus the same $199/mo software fee) via Stripe Checkout — both self-serve, no scoping call required.',
  path: '/checkout',
});

// Both tiers are real Stripe Checkout integrations (see CheckoutButtons.tsx,
// Tier2CheckoutButton.tsx, and app/api/checkout/session/route.ts): Tier 1 is a $199/mo
// subscription, Tier 2 the same $199/mo subscription plus a one-time $1,999 setup fee on the first
// invoice. ContactSalesForm alongside Tier 2 is an optional setup-intake form only — it never gates
// or replaces the Stripe purchase. See components/CheckoutTabs.tsx for the tab structure.

interface CheckoutPageProps {
  // Next.js 15+: searchParams is a Promise — see the Next.js 15 upgrade
  // guide's Async Request APIs section. Confirmed live 2026-08-29 as part
  // of the 14->15 upgrade: this was the only sync searchParams/params usage
  // in this repo's app/ tree.
  searchParams: Promise<{ tier?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialTier = resolvedSearchParams?.tier === '2' ? 'tier2' : 'tier1';

  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Checkout</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-10 max-w-2xl">
        Get your license.
      </h1>
      <CheckoutTabs initialTier={initialTier} />
    </div>
  );
}
