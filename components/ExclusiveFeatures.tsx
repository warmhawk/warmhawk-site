import type { ReactNode } from 'react';
import type { ExclusiveFeature, ExclusiveFeatureIcon } from '@/lib/tierConfig';

/**
 * One glyph per `ExclusiveFeatureIcon` value in lib/tierConfig.ts — 16x16, stroke="currentColor",
 * matching the inline-SVG convention used elsewhere on the site (e.g.
 * components/DomainCheckTool.tsx) rather than pulling in an icon library for five glyphs. Single
 * source so every renderer of `exclusiveFeatures` (PricingTable, CheckoutTabs, and anything added
 * later) stays in sync by construction rather than by someone remembering to update N places.
 */
export const EXCLUSIVE_FEATURE_ICONS: Record<ExclusiveFeatureIcon, ReactNode> = {
  // Clock with a back-arrow sweep — DNS change history.
  history: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2a6 6 0 105.2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M13.6 1.8v3.2h-3.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 5v3.3l2.4 1.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
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
 * Renders a tier's `exclusiveFeatures` as an icon-badge list under a dashed divider — the same
 * markup on every surface that sells Tier 2 (pricing cards on /compare/pricing and the homepage,
 * the /checkout Tier 2 sidebar). A new exclusive feature only needs adding once, in
 * lib/tierConfig.ts's `exclusiveFeatures` array — every caller of this component picks it up with
 * no second place to remember to update.
 */
export function ExclusiveFeaturesList({
  features,
  heading = 'Tier 2 exclusive',
}: {
  features: ExclusiveFeature[];
  heading?: string;
}) {
  if (features.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-border">
      <div className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase text-rust mb-2.5">
        {heading}
      </div>
      <ul className="list-none m-0 p-0 space-y-2">
        {features.map((exclusive) => (
          <li key={exclusive.label} className="flex items-center gap-2.5 text-sm text-ink-muted">
            <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full border border-rust/25 bg-rust-tint text-rust">
              {EXCLUSIVE_FEATURE_ICONS[exclusive.icon]}
            </span>
            {exclusive.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
