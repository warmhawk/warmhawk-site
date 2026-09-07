import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { tiers } from '@/lib/tierConfig';

export const metadata: Metadata = pageSeo({
  title: 'Operator Dashboard',
  description:
    'What the Tier 1/2 WarmHawk operator dashboard actually looks like: live queue inspector, domain health, team management, and 2FA — real screenshots, not mockups. No API or code required to run it day to day.',
  path: '/dashboard',
});

const tier1 = tiers.find((t) => t.id === 'self-hosted-pro')!;

// CSS-only lightbox (no client JS): the trigger `<a>` points at this Shot's own `#zoom-<id>`
// fragment, and `target:flex` shows the overlay only while that fragment is the active URL hash —
// same "let native HTML carry the interaction" approach as CodeBlock's <details>. On a phone the
// four screenshots below render at ~360px wide, too small to read a table row or a QR code; this
// is the fix, not a decorative extra.
function Shot({
  id,
  src,
  alt,
  title,
  body,
  path,
}: {
  id: string;
  src: string;
  alt: string;
  title: string;
  body: string;
  path: string;
}) {
  return (
    <div className="card bg-cream overflow-hidden mb-10">
      {/* Browser-chrome frame: without it, a full-bleed screenshot reads as a live embedded panel
          rather than a picture of one. Traffic-light dots + a url bar are the standard cue that
          says "this is a captured screenshot," matching the page copy's own claim below. */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-deep">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-fail/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-pending/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-pass/70" />
        </span>
        <span className="ml-1.5 font-mono text-[11px] text-slate-soft/70 truncate">{path}</span>
      </div>
      <a href={`#zoom-${id}`} aria-label={`Zoom in: ${alt}`} className="group relative block">
        <img src={src} alt={alt} className="w-full border-b border-border" />
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 text-paper text-[11px] font-semibold tracking-wide px-2.5 py-1 group-hover:bg-ink transition-colors"
        >
          &#128269; Tap to zoom
        </span>
      </a>
      <div className="p-6">
        <div className="font-semibold text-base mb-1">{title}</div>
        <div className="text-[14px] leading-relaxed text-ink-muted">{body}</div>
      </div>

      {/* These screenshots are all ~1440px wide (landscape). Capping the zoomed copy by both
          max-width AND max-height (an earlier version of this) makes it render at roughly the
          SAME on-screen size as the thumbnail on a portrait phone — the width constraint alone
          already forces it small, so the height cap never even engages. Below the `sm` breakpoint
          the image instead renders at a fixed 900px — genuinely larger than any phone's viewport —
          inside a scrolling container, so it's actually legible and the visitor pans to read the
          rest. At `sm` and up there's room to fit the whole image on screen, so it switches back
          to a normal max-width/max-height-capped, centered layout. */}
      <div
        id={`zoom-${id}`}
        className="hidden target:block sm:target:flex fixed inset-0 z-50 items-center justify-center bg-ink/90 overflow-auto p-4"
      >
        {/* `fixed`, not `absolute`: stays pinned to the viewport as the backdrop even while the
            oversized mobile image is scrolled, so tapping outside the image always closes it. */}
        <a href="#" aria-label="Close zoomed screenshot" className="fixed inset-0" />
        <div className="relative inline-block">
          <img
            src={src}
            alt={alt}
            className="w-[900px] max-w-none h-auto rounded-lg shadow-2xl sm:w-auto sm:max-w-[90vw] sm:max-h-[85vh]"
          />
          <a
            href="#"
            aria-label="Close zoomed screenshot"
            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-paper text-ink border border-border shadow flex items-center justify-center font-bold leading-none"
          >
            &#10005;
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Tier 1 / Tier 2</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        The dashboard you run day to day &mdash; no API, no code.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        Everything on this page is a real screenshot of the actual operator dashboard, taken from a
        live WarmHawk instance &mdash; not a mockup. If you&rsquo;re on Tier 1 or Tier 2, this is
        what you log into. You never touch the API docs elsewhere on this site.
      </p>
      <AnswerBlock>
        The WarmHawk operator dashboard (Tier 1 Self-Hosted Pro, Tier 2 Enterprise DFY) is a web UI
        on top of the same sending engine as the free API: a live queue inspector, domain health
        monitoring (SPF/DKIM/DMARC + blocklists), team management with flat permissions, and 2FA on
        login. It replaces curl and config files with pages you click through.
      </AnswerBlock>

      <div className="mt-4 mb-14">
        <Link href="/checkout?tier=1" className="btn btn-primary">
          {tier1.ctaLabel} &mdash; {tier1.priceAmount}
          {tier1.priceSuffix}
        </Link>
        <span className="ml-4 text-sm text-ink-muted">{tier1.priceNote}</span>
      </div>

      <Shot
        id="queue"
        path="app.warmhawk.com/dashboard/queue"
        src="/dashboard-screens/queue.png"
        alt="WarmHawk operator dashboard Live Queue page, showing real-time BullMQ dispatcher state"
        title="Live queue inspector"
        body="Real-time send-queue state — queued, sending, sent today, failed/retrying — auto-refreshing every 5 seconds, with per-mailbox daily send caps you adjust right from this page. No BullMQ dashboard or Redis CLI required."
      />

      <Shot
        id="domains"
        path="app.warmhawk.com/dashboard/domains"
        src="/dashboard-screens/domains.png"
        alt="WarmHawk operator dashboard Domain Health page, tracking SPF, DKIM, DMARC, and blocklist status per domain"
        title="Domain health, tracked automatically"
        body="Every sending domain gets continuous SPF/DKIM/DMARC and blocklist monitoring, plus real inbox-placement sampling from seed accounts you control &mdash; not a simulated warmup score."
      />

      <Shot
        id="team"
        path="app.warmhawk.com/dashboard/team"
        src="/dashboard-screens/team.png"
        alt="WarmHawk operator dashboard Team members page"
        title="Team, without a permissions system to configure"
        body="Flat permissions, by design: invite a teammate and they get the same full access as the owner &mdash; no roles to define, no access matrix to maintain. Unlimited team members on Tier 1/2, at the one flat monthly fee."
      />

      <Shot
        id="security"
        path="app.warmhawk.com/dashboard/settings/security"
        src="/dashboard-screens/security.png"
        alt="WarmHawk operator dashboard Security page, two-factor authentication setup"
        title="2FA required on every dashboard login"
        body="Two-factor authentication (any standard authenticator app) is required for Tier 1/Tier 2 dashboard access, set up with a QR code from this page &mdash; not an optional toggle buried in settings."
      />

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <h2 className="font-display text-xl font-semibold mb-3">Everything Tier 1 includes</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted">
          {tier1.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted mt-5">
          Full tier-by-tier breakdown:{' '}
          <Link href="/compare/pricing" className="text-rust font-semibold">
            the pricing comparison
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
