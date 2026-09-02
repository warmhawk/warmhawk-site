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
 *
 * Responsive fix 1: below `md`, the link list above was simply `hidden` with
 * no alternative way to reach it — Product/Compare/Pricing/Docs/Dashboard
 * were completely unreachable from the header on any phone or small tablet
 * (confirmed via an accessibility-tree snapshot at 390px: those five links
 * don't appear anywhere in the rendered page outside the footer, which sits
 * below the entire homepage). Fixed with a `<details>/<summary>` disclosure
 * menu, the same zero-JS expand/collapse idiom already used for the FAQ
 * accordion (see FaqSchema.tsx's header comment) — native, keyboard- and
 * screen-reader-accessible, and needs no client component/useState.
 *
 * Responsive fix 2: the breakpoint for showing that link list was `md`
 * (768px) — the exact width of an iPad Mini/Air/base-model iPad held in
 * portrait, a genuinely common device orientation, not an edge case.
 * Confirmed via a real Playwright sweep (168 page loads: 21 routes x 8
 * device widths) that at exactly 768px the row — logo, all five nav links,
 * "Free engine", and "Start Tier 1" — has no room to fit on one line and no
 * way to wrap, so it overflowed 79px past the viewport on every single page
 * in the site (this is a shared layout component). It first fits cleanly at
 * `lg` (1024px), confirmed by the same sweep finding zero overflow there —
 * so the full link list now waits for `lg` instead of `md`, and the
 * `<details>` menu (already the only way to reach these links below `md`)
 * covers the newly-widened `md`-to-`lg` gap too.
 */
export function Nav() {
  return (
    <div className="border-b border-border relative">
      <div className="wrap flex items-center justify-between h-20 gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="font-display text-xl font-bold">WarmHawk</span>
        </Link>
        <div className="hidden lg:flex items-center gap-6 text-[14.5px] font-medium text-ink-muted">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-rust transition-colors">
              {item.label}
            </Link>
          ))}
          {/* Was an external link to github.com/warmhawk/warmhawk-enterprise-operator, which is a
              private-forever repo (see that repo's own README) — so this 404'd for every visitor,
              on every page of the site. Points at the docs describing what the dashboard actually
              does instead. */}
          <Link href="/docs/introduction" className="hover:text-rust transition-colors">
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs/quickstart" className="hidden sm:inline-flex btn btn-ghost btn-sm">
            Free engine ↗
          </Link>
          <details className="lg:hidden group">
            <summary
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border-[1.5px] border-border cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden"
            >
              <svg
                className="h-4 w-4 group-open:hidden"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              >
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
              <svg
                className="hidden h-4 w-4 group-open:block"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </summary>
            <nav className="absolute inset-x-0 top-full border-b border-border bg-paper px-5 py-4 flex flex-col gap-1 text-[15px] font-medium text-ink-muted shadow-lg z-50">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2.5 py-2.5 hover:bg-cream-elevated hover:text-ink transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/docs/introduction"
                className="rounded-lg px-2.5 py-2.5 hover:bg-cream-elevated hover:text-ink transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/docs/quickstart"
                className="sm:hidden rounded-lg px-2.5 py-2.5 hover:bg-cream-elevated hover:text-ink transition-colors"
              >
                Free engine ↗
              </Link>
            </nav>
          </details>
          {/*
            Bug fix (mobile horizontal-scroll regression found in manual QA at 390x844):
            `.btn` (globals.css) sets `whitespace-nowrap`, and this label ("Start Tier 1 —
            $199/mo") combined with the logo on a non-wrapping `justify-between` header row
            (no `flex-wrap`) doesn't fit inside a 390px viewport once `.wrap`'s side padding is
            subtracted — the row overflowed instead of reflowing, causing a page-wide horizontal
            scrollbar on every page. Root cause is the forced single line, not the flex layout
            itself, so the fix overrides `whitespace-nowrap` with a plain `whitespace-normal`
            utility (the utilities layer already wins over `.btn`'s components-layer rule per the
            header comment above `.btn` in globals.css) so the label can wrap onto a second line
            and the flex item can shrink below its former single-line intrinsic width. This is
            unconditional (no breakpoint) so it also self-heals the same failure mode between
            640-767px, where the "Free engine" ghost button reappears alongside this one and needs
            the same room. At normal desktop widths there's ample space, so the browser never
            actually wraps it — same single-line look as before.
          */}
          <Link
            href="/checkout?tier=1"
            className="btn btn-primary btn-sm whitespace-normal text-center leading-snug"
          >
            {proTier.ctaLabel} — {proTier.price}/mo
          </Link>
        </div>
      </div>
    </div>
  );
}
