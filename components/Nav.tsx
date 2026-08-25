import Link from 'next/link';
import { mainNav } from '@/lib/siteConfig';
import { tiers } from '@/lib/tierConfig';
import { BrandMark } from '@/components/BrandMark';

const proTier = tiers.find((t) => t.id === 'self-hosted-pro')!;

/**
 * Matches the artifact's SITE_HEADER exactly: Product / Compare / Pricing /
 * Docs / Dashboard (arrow-flagged, external) nav links, then a ghost
 * "Free engine" CTA + a primary "Start Tier 1 — $199/mo" CTA. The previous
 * version here had a "Sign in" link with no artifact source and no free-tier
 * CTA at all.
 */
export function Nav() {
  return (
    <div className="border-b border-border">
      <div className="wrap flex items-center justify-between h-20 gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="font-display text-xl font-bold">WarmHawk</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-[14.5px] font-medium text-ink-muted">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-rust transition-colors">
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/warmhawk/warmhawk-enterprise-operator"
            className="hover:text-rust transition-colors"
          >
            Dashboard ↗
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs/quickstart" className="hidden sm:inline-flex btn btn-ghost btn-sm">
            Free engine ↗
          </Link>
          <Link href="/checkout?tier=1" className="btn btn-primary btn-sm">
            {proTier.ctaLabel} — {proTier.price}/mo
          </Link>
        </div>
      </div>
    </div>
  );
}
