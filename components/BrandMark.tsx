/**
 * The artifact's exact logo mark (warmhawk-full-prototype.html SITE_HEADER /
 * SITE_FOOTER: `<svg class="brand-mark" viewBox="0 0 32 32">...`) — a rust
 * rounded-square badge with a paper arrow-path and an amber dot, not the
 * previous unrelated hawk-wing zigzag shape. Colors use the theme's `rust` /
 * `paper` / `amber` tokens rather than hardcoded hex so this stays in sync
 * with any future palette change.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-rust" />
      <path
        d="M6 22L14 10L18 16L26 8"
        className="stroke-paper"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="8" r="2.1" className="fill-amber" />
    </svg>
  );
}
