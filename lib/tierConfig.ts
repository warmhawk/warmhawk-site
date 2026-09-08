/**
 * Marketing-side mirror of the tier/feature matrix.
 *
 * Per the spec's "Single Source of Truth — Tier & Feature Constants"
 * section (V12): the real enforced source of truth is
 * `packages/tier-config/src/constants.ts` in `warmhawk-core-engine`,
 * imported at runtime by `warmhawk-enterprise-operator`'s `LicenseGate`.
 * `warmhawk-site` is a separate, static-leaning repo with no dependency on
 * either other repo's runtime (Repo Architecture), so it cannot import
 * that TypeScript file directly — this is the one place, like the equivalent
 * `llms.txt` and legal pages elsewhere in this product family, that has to stay hand-synced instead.
 *
 * RULE: before every release, run `npm run check:tier-sync` (scripts/check-tier-sync.mjs) with
 * `warmhawk-core-engine` checked out as a sibling directory — it diffs this file's `isTier2`,
 * `auditLog`, and support-SLA claims against `packages/tier-config/src/constants.ts`
 * mechanically. It is NOT wired into CI (that repo isn't checked out there), so it only catches
 * drift when someone actually runs it — still run it by hand if the sibling repo isn't available
 * locally. Drift here is exactly the failure mode the Single Source of Truth section exists to
 * prevent — don't let the marketing site's copy of the pricing table quietly go stale.
 */

export type TierId = 'open-core' | 'self-hosted-pro' | 'enterprise-dfy';

/** The four glyphs available to an exclusive-feature row — see `ExclusiveFeature` below. Add a
 *  new one in `EXCLUSIVE_FEATURE_ICONS` (components/PricingTable.tsx) before using it here. */
export type ExclusiveFeatureIcon = 'badge' | 'certificate' | 'compliance' | 'radar';

/**
 * A feature gated by the real `isTier2` flag in warmhawk-enterprise-operator's `LicenseGate`
 * (packages/tier-config/src/constants.ts, `TierFeatures.isTier2`) — currently exactly four UI
 * surfaces: `BadgeEmbedPanel` ("Get your badge"), the per-domain "Download certificate" button,
 * the per-domain "Export compliance report" button, and `LookalikeCandidatesPanel`
 * ("Lookalike domain monitoring"). Rendered by PricingTable.tsx with its own icon instead of the
 * plain checkmark used for `features` below, so it visually reads as Tier-2-exclusive rather than
 * blending into the generic bullet list.
 */
export interface ExclusiveFeature {
  icon: ExclusiveFeatureIcon;
  label: string;
}

export interface TierDefinition {
  id: TierId;
  name: string;
  price: string;
  priceDetail: string;
  annualPrice?: string;
  highlight?: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: string[];
  /** Only `enterprise-dfy` has these today — see `ExclusiveFeature` above. */
  exclusiveFeatures?: ExclusiveFeature[];
  // The fields below feed PricingTable.tsx's `.price-card` layout specifically —
  // the artifact splits what `name`/`price`/`priceDetail` conflate above into
  // five distinct pieces (a small "Tier N —" label, a separate price-name,
  // a mono price amount + suffix, and a note line). Kept as separate fields
  // rather than repurposing the ones above, since docs/introduction/page.tsx's
  // simpler summary card already depends on `name`/`price`/`priceDetail`
  // meaning what they currently mean.
  tierLabel: string;
  priceName: string;
  priceAmount: string;
  priceSuffix?: string;
  priceNote: string;
}

export const tiers: TierDefinition[] = [
  {
    id: 'open-core',
    name: 'Open Core',
    price: 'Free',
    priceDetail: 'GitHub / Docker, self-hosted',
    ctaLabel: 'Get the free engine',
    // Was a direct link to the core-engine GitHub repo, which is private today — a 404 on the
    // pricing table's most-clicked free-tier CTA. /docs/quickstart is where every other "get the
    // free engine" button on the site already points (homepage, footer, nav), it carries the real
    // install command, and it stays correct whether or not the repo is public.
    ctaHref: '/docs/quickstart',
    tierLabel: 'Tier 0 — Open Core',
    priceName: 'Free',
    priceAmount: '$0',
    priceNote: 'Direct API access, no web UI',
    features: [
      'Full API, sending/queueing engine, direct access',
      'CSV lead import via API',
      'Gemini/Claude BYOK AI personalization via API',
      'Own nginx/TLS package, one-command install.sh',
      'One-command in-place upgrades (warmhawk update)',
      'Business Source License — non-compete grant, Apache 2.0 after 4 years',
    ],
  },
  {
    id: 'self-hosted-pro',
    name: 'Self-Hosted Pro',
    price: '$199',
    priceDetail: '/ month',
    annualPrice: '$1,990/yr (2 months free)',
    highlight: true,
    ctaLabel: 'Start Tier 1',
    ctaHref: '/checkout?tier=1',
    tierLabel: 'Tier 1 — Self-Hosted Pro',
    priceName: 'Self-Hosted Pro',
    priceAmount: '$199',
    priceSuffix: '/mo',
    priceNote: 'or $1,990/yr — two months free',
    features: [
      'Full operator dashboard',
      'Unlimited client domains, mailboxes & users (flat fee)',
      'Live queue inspector, throttling controls, domain health alerts',
      'Bundled Uptime Kuma + native OTEL export, on by default',
      'Nightly backups, bundled + documented, default-on',
      '2FA/MFA on dashboard login',
      'Team invite/remove (flat permissions)',
      'support@warmhawk.com — 1 business day / 4h critical SLA',
      '30-day money-back guarantee',
    ],
  },
  {
    id: 'enterprise-dfy',
    name: 'Enterprise DFY',
    price: '$1,999',
    priceDetail: 'one-time setup + $199/mo software fee',
    ctaLabel: 'Get started — $1,999 + $199/mo',
    ctaHref: '/checkout?tier=2',
    tierLabel: 'Tier 2 — Enterprise DFY',
    priceName: 'Done-For-You',
    priceAmount: '$1,999',
    priceNote: '$1,999 one-time setup, then $199/month for the software',
    features: [
      'Everything in Self-Hosted Pro',
      'Direct founder line, same-business-day response',
      'Audit log (planned, procurement-driven)',
    ],
    exclusiveFeatures: [
      { icon: 'badge', label: 'Trust badge embed' },
      { icon: 'certificate', label: 'Domain certificate PDF' },
      { icon: 'compliance', label: 'Compliance report PDF' },
      { icon: 'radar', label: 'Lookalike-domain monitoring' },
    ],
  },
];
