import Link from 'next/link';
import { tiers } from '@/lib/tierConfig';

/**
 * Matches the artifact's `.price-card`/`.price-badge`/`.price-tier`/
 * `.price-name`/`.price-amt`/`.price-note`/`.price-feats` exactly — the
 * featured (Tier 1) card is a dark `--slate` card with an amber tier label
 * and a top-left badge, not a light card with a translated-up border like
 * the previous version here. Reused on the homepage and /compare/pricing so
 * the two never drift (copy/numbers pulled from lib/tierConfig.ts).
 */
export function PricingTable() {
  return (
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
          {tier.highlight && (
            <span className="absolute -top-[13px] left-[26px] bg-rust text-paper font-mono text-[11px] tracking-[0.08em] uppercase px-[10px] py-[5px] rounded-[6px]">
              Most agencies start here
            </span>
          )}
          <div className={`font-mono text-xs tracking-[0.1em] uppercase ${tier.highlight ? 'text-amber' : 'text-rust'}`}>
            {tier.tierLabel}
          </div>
          <div className="font-display text-[21px] font-semibold mt-2">{tier.priceName}</div>
          <div className="mt-3 font-mono text-[32px] font-semibold">
            {tier.priceAmount}
            {tier.priceSuffix && <span className="text-[13px] font-medium opacity-65">{tier.priceSuffix}</span>}
          </div>
          <div className={`text-[12.5px] mt-1 ${tier.highlight ? 'text-slate-soft' : 'text-ink-muted'}`}>
            {tier.priceNote}
          </div>

          <ul className="list-none m-0 mt-5 mb-6 p-0 flex-1">
            {tier.features.map((feature, i) => (
              <li
                key={feature}
                className={`text-sm py-[9px] pl-6 relative ${i === 0 ? '' : tier.highlight ? 'border-t border-border-dark' : 'border-t border-border'} ${tier.highlight ? 'text-slate-soft' : 'text-ink-muted'}`}
              >
                <span className={`absolute left-0 font-bold ${tier.highlight ? 'text-amber' : 'text-rust'}`}>
                  &#10003;
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href={tier.ctaHref}
            className={`btn btn-block ${tier.highlight ? 'btn-primary' : 'btn-ghost'}`}
          >
            {tier.ctaLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
