import Link from 'next/link';
import { tiers } from '@/lib/tierConfig';
import { siteConfig } from '@/lib/siteConfig';

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

            <ul className="list-none m-0 mt-5 mb-6 p-0 flex-1">
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
