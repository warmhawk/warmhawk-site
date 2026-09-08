import type { ReactNode } from 'react';
import Link from 'next/link';
import { tiers, type ExclusiveFeatureIcon } from '@/lib/tierConfig';
import { siteConfig } from '@/lib/siteConfig';

/**
 * One glyph per `ExclusiveFeatureIcon` value in lib/tierConfig.ts — 16x16, stroke="currentColor",
 * matching the inline-SVG convention already used elsewhere on the site (e.g.
 * components/DomainCheckTool.tsx) rather than pulling in an icon library for four glyphs.
 */
const EXCLUSIVE_FEATURE_ICONS: Record<ExclusiveFeatureIcon, ReactNode> = {
  // Shield with a check — trust badge embed.
  badge: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5l5 1.8v4.2c0 3.4-2.1 5.9-5 7-2.9-1.1-5-3.6-5-7V3.3l5-1.8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.7 8.1l1.6 1.6 3-3.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  // Document with a rosette/ribbon seal — the per-domain certificate PDF.
  certificate: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 1.5h6.4L12.5 4v9a1 1 0 01-1 1h-8a1 1 0 01-1-1v-10a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8.4" r="1.9" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6.6 10.1L6 13.5l2-1.1 2 1.1-.6-3.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  // Document with checklist lines — the per-domain compliance-report PDF.
  compliance: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 1.5h6.4L12.5 4v9a1 1 0 01-1 1h-8a1 1 0 01-1-1v-10a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.3 7.4l1 1 1.9-2.1M5.3 11h5.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  // Radar sweep — lookalike-domain monitoring.
  radar: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
      <path d="M8 8L11.5 4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * Matches the artifact's `.price-card`/`.price-badge`/`.price-tier`/
 * `.price-name`/`.price-amt`/`.price-note`/`.price-feats` exactly — the
 * featured (Tier 1) card is a dark `--slate` card with an amber tier label
 * and a top-left badge, not a light card with a translated-up border like
 * the previous version here. Reused on the homepage and /compare/pricing so
 * the two never drift (copy/numbers pulled from lib/tierConfig.ts).
 *
 * The White-Label/MSP row below is deliberately NOT a 4th entry in
 * `tiers` — it isn't a real, purchasable tier (no price, no checkout,
 * `TierId` stays the real 3-value licensing union). It's a dashed-border
 * "talk to a founder" placeholder for two asks that are buildable today
 * with zero new tenancy model: custom branding per install, and
 * multi-client volume pricing across separate installs. Routes to a plain
 * mailto — the same manual, founder-led motion Tier 2's ContactSalesForm
 * already runs on, without implying a structured intake pipeline for a
 * product that doesn't exist yet.
 */
export function PricingTable() {
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-[22px] items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={
              tier.highlight
                ? 'relative flex flex-col bg-slate text-paper border border-slate rounded-[18px] p-[26px] shadow-[0_26px_50px_-30px_rgba(37,29,20,0.5)]'
                : 'relative flex flex-col bg-paper border border-border rounded-[18px] p-[26px]'
            }
          >
            <div
              className={`font-mono text-xs tracking-[0.1em] uppercase ${tier.highlight ? 'text-amber' : 'text-rust'}`}
            >
              {tier.tierLabel}
            </div>
            <div className="font-display text-[21px] font-semibold mt-2">{tier.priceName}</div>
            <div className="mt-3 font-mono text-[32px] font-semibold">
              {tier.priceAmount}
              {tier.priceSuffix && (
                <span className="text-[13px] font-medium opacity-65">{tier.priceSuffix}</span>
              )}
            </div>
            <div
              className={`text-[12.5px] mt-1 ${tier.highlight ? 'text-slate-soft' : 'text-ink-muted'}`}
            >
              {tier.priceNote}
            </div>

            <div className="flex-1 mt-5 mb-6">
              <ul className="list-none m-0 p-0">
                {tier.features.map((feature, i) => (
                  <li
                    key={feature}
                    className={`text-sm py-[9px] pl-6 relative ${i === 0 ? '' : tier.highlight ? 'border-t border-border-dark' : 'border-t border-border'} ${tier.highlight ? 'text-slate-soft' : 'text-ink-muted'}`}
                  >
                    <span
                      className={`absolute left-0 font-bold ${tier.highlight ? 'text-amber' : 'text-rust'}`}
                    >
                      &#10003;
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.exclusiveFeatures && (
                <div className="mt-4 pt-4 border-t border-dashed border-border">
                  <div className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase text-rust mb-2.5">
                    Tier 2 exclusive
                  </div>
                  <ul className="list-none m-0 p-0 space-y-2">
                    {tier.exclusiveFeatures.map((exclusive) => (
                      <li
                        key={exclusive.label}
                        className="flex items-center gap-2.5 text-sm text-ink-muted"
                      >
                        <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-rust-tint text-rust">
                          {EXCLUSIVE_FEATURE_ICONS[exclusive.icon]}
                        </span>
                        {exclusive.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Link
              href={tier.ctaHref}
              className={`btn btn-block whitespace-normal text-center leading-snug ${tier.highlight ? 'btn-primary' : 'btn-ghost'}`}
            >
              {tier.ctaLabel}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-[22px] flex flex-col sm:flex-row sm:items-center gap-4 rounded-[18px] border border-dashed border-border p-[22px]">
        <div className="flex-1">
          <div className="font-mono text-xs tracking-[0.1em] uppercase text-rust">
            White-Label / MSP
          </div>
          <div className="font-display text-[17px] font-semibold mt-1">
            Running warmhawk for multiple clients?
          </div>
          <p className="text-sm text-ink-muted mt-1.5 max-w-[46ch]">
            Custom branding on your client&rsquo;s dashboard, or bulk pricing across several
            separate installs — no new price, no checkout flow, just a conversation with the
            founder.
          </p>
        </div>
        <a
          href={`mailto:${siteConfig.helloEmail}?subject=White-label%2FMSP%20inquiry`}
          className="btn btn-ghost whitespace-normal text-center leading-snug shrink-0"
        >
          Contact us
        </a>
      </div>
    </div>
  );
}
