'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { tiers } from '@/lib/tierConfig';
import { CheckoutButtons } from '@/components/CheckoutButtons';
import { ContactSalesForm } from '@/components/ContactSalesForm';

type TierKey = 'tier1' | 'tier2';

/**
 * Tier 1 / Tier 2 checkout tabs — the `.tabs`/`.tab-panel` pattern from
 * warmhawk-full-prototype.html's own #page-checkout section (data-tabgroup="checkout-tier"),
 * rebuilt with this repo's actual Tailwind/component conventions rather than the prototype's raw
 * CSS classes. No generic Tabs component existed in components/ yet — this is deliberately scoped
 * to checkout's two tiers rather than a fully generic abstraction, since it's the only caller.
 *
 * Tier 1 renders the already-working CheckoutButtons (Stripe Checkout Session redirect); Tier 2
 * renders ContactSalesForm (POSTs to /api/contact-sales — a sales inquiry, never a charge).
 */
export function CheckoutTabs({ initialTier }: { initialTier: TierKey }) {
  const [active, setActive] = useState<TierKey>(initialTier);
  const tier1 = tiers.find((t) => t.id === 'self-hosted-pro');
  const tier2 = tiers.find((t) => t.id === 'enterprise-dfy');

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
      <div>
        <div role="tablist" aria-label="Checkout tier" className="flex gap-2 border-b border-border mb-8">
          <TabButton active={active === 'tier1'} onClick={() => setActive('tier1')} id="tier-1">
            Tier 1 — Self-Hosted Pro
          </TabButton>
          <TabButton active={active === 'tier2'} onClick={() => setActive('tier2')} id="tier-2">
            Tier 2 — Enterprise DFY
          </TabButton>
        </div>

        <div role="tabpanel" aria-labelledby="tier-1" hidden={active !== 'tier1'}>
          <CheckoutButtons />
        </div>
        <div role="tabpanel" aria-labelledby="tier-2" hidden={active !== 'tier2'}>
          <ContactSalesForm />
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-6">
          <div className="label text-ink-muted mb-3">
            What&rsquo;s included — {active === 'tier1' ? tier1?.name : tier2?.name}
          </div>
          <ul className="space-y-2.5 text-[13.5px]">
            {(active === 'tier1' ? tier1?.features : tier2?.features)?.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-rust">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <div className="font-semibold text-sm mb-2">Questions before you buy?</div>
          <p className="text-[13.5px] text-ink-muted leading-relaxed">
            Read the{' '}
            <Link href="/compare/pricing" className="text-rust font-semibold">
              full tier comparison
            </Link>{' '}
            or the{' '}
            <Link href="/legal/dpa" className="text-rust font-semibold">
              DPA
            </Link>{' '}
            your procurement team may ask for.
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  id,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-3 text-[14.5px] font-semibold border-b-2 -mb-px transition-colors ${
        active ? 'border-rust text-rust' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
