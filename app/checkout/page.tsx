import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { CheckoutTabs } from '@/components/CheckoutTabs';

export const metadata: Metadata = pageSeo({
  title: 'Checkout',
  description:
    'Start Tier 1 (Self-Hosted Pro, $199/mo) via Stripe Checkout, or reach out about Tier 2 (Enterprise DFY, $1,500 + $300/mo) — a custom-scoped engagement handled directly by WarmHawk’s founder.',
  path: '/checkout',
});

// Matched against the source design artifact's #page-checkout section
// (warmhawk-full-prototype.html, lines 1048-1119):
// same eyebrow ("Checkout"), same exact h1 ("Get your license."), same Tier 1 / Tier 2 tab
// structure and the same two side cards ("What's included", "Questions before you buy?"). The one
// deliberate departure is the tab-panel content itself — the artifact mocks up raw card-number/
// expiry/CVC input fields, but this is a real Stripe integration (see CheckoutButtons.tsx and
// app/api/checkout/session/route.ts), so Tier 1 renders a hosted-Checkout-redirect button instead
// of fake PCI-scope-triggering card fields, and Tier 2 posts to a real /api/contact-sales endpoint
// instead of a static form. See components/CheckoutTabs.tsx for the full artifact cross-reference.

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
