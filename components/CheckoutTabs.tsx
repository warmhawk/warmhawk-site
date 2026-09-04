'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { tiers } from '@/lib/tierConfig';
import { CheckoutButtons } from '@/components/CheckoutButtons';
import { Tier2CheckoutButton } from '@/components/Tier2CheckoutButton';
import { ContactSalesForm } from '@/components/ContactSalesForm';

type TierKey = 'tier1' | 'tier2';

/**
 * Tier 1 / Tier 2 checkout tabs — the `.tabs`/`.tab-panel` pattern from
 * warmhawk-full-prototype.html's own #page-checkout section (data-tabgroup="checkout-tier"),
 * rebuilt with this repo's actual Tailwind/component conventions rather than the prototype's raw
 * CSS classes. No generic Tabs component existed in components/ yet — this is deliberately scoped
 * to checkout's two tiers rather than a fully generic abstraction, since it's the only caller.
 *
 * Tier 1 renders CheckoutButtons (Stripe Checkout Session redirect, subscription mode). Tier 2
 * renders Tier2CheckoutButton (Stripe Checkout Session redirect, one-time $1,999 payment mode) as
 * the primary CTA, with ContactSalesForm below it as an optional, non-blocking setup-intake form
 * (POSTs to /api/contact-sales — never a charge, never required before buying).
 */
export function CheckoutTabs({ initialTier }: { initialTier: TierKey }) {
  const [active, setActive] = useState<TierKey>(initialTier);
  const tier1 = tiers.find((t) => t.id === 'self-hosted-pro');
  const tier2 = tiers.find((t) => t.id === 'enterprise-dfy');

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
      {/*
        Bug fix, second half (mobile horizontal-scroll regression on
        /checkout): a bare `<div>` grid item defaults to `min-width: auto`,
        whose automatic minimum size is its content's min-content width. At
        a mobile viewport (below `md`, so this `grid` has no explicit
        columns and falls back to one auto-sized track), the tablist's
        buttons — even after fixing their own `whitespace-normal` above —
        still contribute a wide min-content, and CSS Grid's default
        `min-width: auto` on this item let that widen the whole grid track
        (and with it the page) past the viewport: the classic "grid
        blowout" — the browser expands the track to fit content rather
        than shrinking the content, unlike flexbox's more forgiving
        default. `min-w-0` overrides the default so this item — and
        everything grid-track-sized off it — actually respects the
        available width, which is what finally lets the tablist's
        flex-shrink + the buttons' `whitespace-normal` engage as intended.
      */}
      <div className="min-w-0">
        <div
          role="tablist"
          aria-label="Checkout tier"
          className="flex gap-2 border-b border-border mb-8"
        >
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
        <div
          role="tabpanel"
          aria-labelledby="tier-2"
          hidden={active !== 'tier2'}
          className="flex flex-col gap-5"
        >
          <Tier2CheckoutButton />
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
  // Bug fix (mobile horizontal-scroll regression, same family as the
  // Nav.tsx CTA fix): a plain <button>'s browser-default UA stylesheet
  // forces its label onto one line, and this tablist row (`flex gap-2`,
  // no `flex-wrap`) doesn't otherwise allow it to reflow. At a 390px
  // viewport, "Tier 2 — Enterprise DFY" alone pushed the row 6px past the
  // viewport width, producing a page-wide horizontal scrollbar on
  // /checkout. `whitespace-normal` lets the label wrap onto a second line
  // when space is tight; `text-center` keeps a wrapped two-line label
  // readable. At normal widths there's room for one line, so this is a
  // no-op visually.
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-3 text-[14.5px] font-semibold border-b-2 -mb-px transition-colors whitespace-normal text-center ${
        active ? 'border-rust text-rust' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
