/**
 * The standing "own infrastructure, not shared SaaS" callout — pain point
 * #18 in the Competitor Pain Points table. This claim is true against
 * every competitor simultaneously (Instantly, Smartlead, Lemlist,
 * Woodpecker, and any custom n8n build), so every /vs/* page renders it
 * verbatim rather than one page treating it as a page-specific point.
 */
export function ComparisonCallout() {
  return (
    <div className="card bg-cream-elevated p-8 my-10">
      <div className="label text-rust mb-3">True against every competitor in this category</div>
      <h3 className="font-display text-xl font-semibold mb-3">
        WarmHawk is the only infrastructure-level single-tenant option
      </h3>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-3xl">
        Instantly, Smartlead, Lemlist, Woodpecker, and every other cold-email SaaS reviewed run
        shared multi-tenant servers — every customer&rsquo;s data and sending infrastructure sits on
        the vendor&rsquo;s own shared boxes, with &ldquo;dedicated IP&rdquo; add-ons (where offered
        at all) only isolating the sending IP, not the application, database, or proxy layer
        underneath it. No competitor in this space publishes a self-hosted or per-customer container
        option. WarmHawk gives every Tier 0/Tier 1 account its own complete package — own
        containers, own database, own nginx, own TLS certificate, own Docker network — nothing
        shared with any other customer or with WarmHawk itself. That&rsquo;s not &ldquo;different
        pricing,&rdquo; it&rsquo;s a genuine category difference.
        <span className="block mt-2 text-[13px]">
          Source: competitor architecture research, public docs — no vendor in this category
          publishes a self-hosted or per-customer-container option.
        </span>
      </p>
    </div>
  );
}
