import Link from 'next/link';

/**
 * "Also check: MX · SPF · DKIM · DMARC · Blacklist · Full report" — connects link equity and
 * crawl paths across all 6 domain-check pages (see notes/1-plan/domain-check-seo-landing-pages.md,
 * Section 6 "Cross-linking"). One shared list rather than six hand-copied ones, so adding a
 * seventh page later means editing this file once.
 */
const TOOL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/tools/mx-checker', label: 'MX' },
  { href: '/tools/spf-checker', label: 'SPF' },
  { href: '/tools/dkim-checker', label: 'DKIM' },
  { href: '/tools/dmarc-checker', label: 'DMARC' },
  { href: '/tools/blacklist-checker', label: 'Blacklist' },
  { href: '/tools/domain-check', label: 'Full report' },
];

export function ToolCrossLinks({ current }: { current: string }) {
  return (
    <div className="wrap flex flex-wrap items-center gap-2 pb-10 text-sm">
      <span className="text-ink-muted mr-1">Also check:</span>
      {TOOL_LINKS.map((link) =>
        link.href === current ? (
          <span
            key={link.href}
            className="rounded-full border border-border bg-cream-elevated px-3 py-1.5 text-ink-muted"
          >
            {link.label}
          </span>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === '/tools/domain-check'
                ? 'rounded-full border-[1.5px] border-rust px-3 py-1.5 font-semibold text-rust hover:bg-rust-tint'
                : 'rounded-full border-[1.5px] border-border-dark px-3 py-1.5 font-medium text-ink hover:bg-ink/5'
            }
          >
            {link.label}
          </Link>
        ),
      )}
    </div>
  );
}
