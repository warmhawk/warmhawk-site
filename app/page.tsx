import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { homeFaqItems } from '@/lib/faqContent';
import { FaqSection } from '@/components/FaqSchema';
import { PricingTable } from '@/components/PricingTable';
import { CompareTable } from '@/components/CompareTable';

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk — Self-hosted cold email infrastructure, one server per account',
  description:
    'Enterprise cold email infrastructure running completely on your own server. Unlimited mailboxes, zero per-seat fees, real deliverability data, AI personalization with Gemini or Claude. Live in under 10 minutes, one command.',
  path: '/',
});

// Copy below is matched section-by-section against the source design artifact
// (warmhawk-full-prototype.html
// `#page-home`) — its exact headline, stat-strip, five-reasons list, compare
// table, FAQ, and closing CTA, not a paraphrase of them. The one deliberate
// departure: the artifact's hero/closing command boxes show a stylized
// `warmhawk install --license --domain` — that's not a real installable
// command (no `warmhawk` CLI binary exists, and core-engine's actual
// `install.sh` takes no `--license` at all — see scripts/install.sh). Kept
// the artifact's terminal-box STYLING exactly (pulsing dot, timer) but with
// the real, working `curl | bash` command in it instead of copy that would
// 404 for anyone who typed it.
//
// 2026-08-30 go-live audit (finding B4): that command was nonetheless broken in two ways,
// both now fixed and verified end to end. (1) `/install` hard-required `--license`, so the
// exact string shown here died immediately on "--license is required" — the installer now
// has a real Tier 0 path (see app/install/route.ts). (2) The domain shown was
// `app.yourcompany.com`, but the script derives `api.<domain>`/`dashboard.<domain>` from
// whatever you pass, so that would have produced `api.app.yourcompany.com`. The bare company
// domain is the correct input.

const features = [
  {
    num: '01',
    title: 'True infrastructure-level single tenancy',
    body: 'Your own containers, database, nginx, TLS certificate, and Docker network. Not a "dedicated IP." Not an isolated row in a shared database. Nothing here is shared with any other customer — or with WarmHawk itself.',
  },
  {
    num: '02',
    title: 'Live in under 10 minutes, one command',
    body: 'Self-hosted infrastructure has a reputation for painful setup. One command handles TLS, secrets, and license activation, start to finish.',
  },
  {
    num: '03',
    title: 'Real deliverability data, not a vanity score',
    body: 'Most "warmup health" numbers are self-reported and can read 90+ while real inbox placement quietly collapses. WarmHawk surfaces an actual seed-inbox placement result on the same domain health screen.',
  },
  {
    num: '04',
    title: 'A queue engine that won’t burn your domains',
    body: 'Every send respects a minimum cadence floor with jitter, and mailbox rotation is capacity-aware, favoring whichever mailbox has sent least recently.',
  },
  {
    num: '05',
    title: 'No per-seat, no credits, no hidden add-ons',
    body: 'One flat fee per account. Warmup, uptime monitoring, and OTEL export are built in, not upsells. Unlimited users and client domains on the same license.',
  },
];

const compareRows = [
  {
    label: 'Infrastructure',
    them: 'Every customer on the vendor’s shared servers',
    us: 'Your own containers, database, nginx, TLS',
  },
  {
    label: 'Pricing model',
    them: 'Per seat and/or per client domain',
    us: 'One flat fee, unlimited users and domains',
  },
  {
    label: 'Deliverability signal',
    them: 'Vendor-reported "heat score"',
    us: 'Real seed-inbox placement test',
  },
  {
    label: 'Setup',
    them: 'Instant — but you own none of the infrastructure',
    us: 'One command, under 10 minutes, and it’s yours',
  },
  {
    label: 'Support',
    them: 'Bot-first or multi-day queue, per G2 reviews',
    us: 'Founder-staffed — 1 business day, 4h on critical',
  },
  {
    label: 'Add-ons',
    them: 'Warmup, whitelabel, analytics sold separately',
    us: 'Included in the flat fee, by default',
  },
];

function InstallCommand({ center = false }: { center?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-3 bg-slate text-slate-soft font-mono text-[13.5px] px-4 py-3 rounded-lg ${center ? 'mx-auto' : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse flex-none" />
      <span className="text-paper">$</span>
      <span className="break-all">
        curl -fsSL https://warmhawk.com/install | bash -s -- --domain yourcompany.com
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />
      {/* HERO */}
      <div className="wrap pt-16 md:pt-[70px] pb-14">
        <div className="grid md:grid-cols-[1.05fr_.95fr] gap-10 md:gap-14 items-center">
          <div>
            <p className="label text-rust mb-4">Self-hosted cold-email infrastructure</p>
            <h1 className="font-display text-4xl md:text-[52px] leading-[1.1] tracking-tight font-semibold mb-5">
              Your sending engine.
              <br />
              Your server. <em className="not-italic text-rust">Your data.</em>
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-7">
              Unlimited mailboxes, zero per-seat fees, real deliverability data instead of a vanity
              warmup score, AI personalization with your choice of Gemini or Claude — and a queue
              that never pushes a domain past what&rsquo;s actually safe.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Link href="/checkout?tier=1" className="btn btn-primary">
                Install in under 10 minutes &rarr;
              </Link>
              <Link href="#compare" className="btn btn-ghost">
                See how tenancy works
              </Link>
            </div>
            <InstallCommand />
          </div>

          <div className="card p-6 md:p-7">
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-mono text-[11.5px] tracking-wide uppercase text-ink-muted">
                Domain health — acme-outreach.com
              </span>
              <span className="font-mono text-[11.5px] tracking-wide uppercase text-ink-muted">
                Live
              </span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <div className="text-sm text-ink-muted">Vendor warmup &ldquo;heat score&rdquo;</div>
                <div className="text-xs text-ink-muted/70 mt-0.5">
                  self-reported by the sending tool
                </div>
              </div>
              <div className="font-mono font-semibold text-lg text-ink-muted/50 line-through">
                97
              </div>
            </div>
            <div className="flex items-center justify-between py-3.5 border-t border-border">
              <div>
                <div className="text-sm text-ink-muted">Real inbox placement</div>
                <div className="text-xs text-ink-muted/70 mt-0.5">seed-inbox placement test</div>
              </div>
              <div className="font-mono font-semibold text-lg text-rust flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rust animate-pulse" />
                94%
              </div>
            </div>
            <svg viewBox="0 0 320 64" preserveAspectRatio="none" className="w-full h-14 mt-3">
              <defs>
                <linearGradient
                  id="heroTrace"
                  x1="0"
                  y1="0"
                  x2="320"
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#DE9E38" />
                  <stop offset="1" stopColor="#B94B27" />
                </linearGradient>
              </defs>
              <path
                d="M0 40 L26 40 L34 14 L42 52 L50 24 L58 40 L86 40 L94 20 L102 46 L110 32 L118 40 L150 40 L158 10 L166 54 L174 28 L182 40 L214 40 L222 18 L230 48 L238 34 L246 40 L280 40 L288 22 L296 44 L304 40 L320 40"
                fill="none"
                stroke="url(#heroTrace)"
                strokeWidth="2.4"
              />
            </svg>
            <p className="text-[11px] text-ink-muted mt-2">Illustrative example, not live data.</p>
          </div>
        </div>
      </div>

      {/* STAT STRIP */}
      <div className="bg-slate text-paper py-8">
        <div className="wrap grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: '100%', label: 'single-tenant infrastructure, per customer' },
            { num: '<10 min', label: 'purchase to running, one command' },
            { num: '$0', label: 'per seat, forever — unlimited users' },
            { num: '8min+jitter', label: 'minimum send cadence floor, enforced' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`text-left ${i > 0 ? 'md:border-l md:border-border-dark md:pl-5' : ''}`}
            >
              <div className="font-mono font-semibold text-2xl text-amber">{stat.num}</div>
              <div className="text-[13px] text-slate-soft mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FIVE REASONS */}
      <div id="features" className="wrap py-16 md:py-[88px]">
        <div className="max-w-xl mb-11">
          <p className="label text-rust mb-3">Why WarmHawk</p>
          <h2 className="font-display text-[28px] md:text-[34px] font-semibold leading-tight">
            Five reasons this isn&rsquo;t just another sending tool.
          </h2>
          <p className="text-base text-ink-muted mt-3">
            Ranked by how much of the category it actually differs from — the first is true against
            every competitor, the rest against most of them.
          </p>
        </div>
        <div>
          {features.map((feature) => (
            <div
              key={feature.num}
              className="grid grid-cols-[56px_1fr] md:grid-cols-[80px_1fr] gap-6 py-7 border-t border-border last:border-b"
            >
              <div className="font-mono text-rust text-[15px] font-semibold pt-0.5">
                {feature.num}
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted max-w-2xl">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPARE — matches the artifact's #compare section exactly: no section-wide
          background band (the artifact has none; that was a previous invention),
          a `.compare-wrap` card (opaque paper, 20px corners, 1.3fr/1fr/1fr columns),
          and a per-cell #FBF3EA highlight on the WarmHawk column. */}
      <div id="compare" className="border-t border-b border-border">
        <div className="wrap py-16 md:py-[88px]">
          <div className="max-w-xl mb-11">
            <p className="label text-rust mb-3">Built different</p>
            <h2 className="font-display text-[28px] md:text-[34px] font-semibold leading-tight">
              Not just priced differently — architected differently.
            </h2>
            <p className="text-base text-ink-muted mt-3">
              Instantly, Smartlead, Lemlist, and Woodpecker all run every customer on shared,
              vendor-owned servers. WarmHawk doesn&rsquo;t.
            </p>
          </div>

          <CompareTable themLabel="Shared SaaS" rows={compareRows} />

          <div className="bg-cream-elevated border border-border rounded-2xl p-5 mt-6 flex gap-3.5 items-start">
            <span className="font-display text-xl text-rust leading-none flex-none">&rdquo;</span>
            <p className="text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">
                Not shared with another agency or customer — full stop.
              </strong>{' '}
              &ldquo;Tenant&rdquo; here means your WarmHawk account: it&rsquo;s fully isolated from
              everyone else&rsquo;s, down to the container and the database. Inside your own
              account, client domains and mailboxes currently share one database — full
              per-end-client workspace isolation is on the roadmap.
            </p>
          </div>
        </div>
      </div>

      <FaqSection items={homeFaqItems} title="Before you install anything." />

      {/* PRICING */}
      <div id="pricing" className="border-b border-border">
        <div className="wrap py-16 md:py-[88px]">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="label text-rust mb-3">Pricing</p>
            <h2 className="font-display text-[28px] md:text-[34px] font-semibold leading-tight mb-3">
              One flat fee. No per-seat math.
            </h2>
            <p className="text-base text-ink-muted">
              Every tier includes the same sending engine. What changes is the dashboard, the
              support SLA, and how much of the running is done for you.
            </p>
          </div>
          <PricingTable />
        </div>
      </div>

      {/* CLOSING */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <p className="label text-amber mb-4">Ready when you are</p>
          <h2 className="font-display text-3xl md:text-[40px] font-semibold mb-4">
            Stop renting your sending infrastructure.
          </h2>
          <p className="text-lg text-slate-soft mb-8">
            One command. Your own server, your own data, running in under 10 minutes.
          </p>
          <div className="flex justify-center mb-9">
            <InstallCommand center />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1 — $199/mo
            </Link>
            <Link href="/docs/quickstart" className="btn btn-on-dark">
              Get the free engine
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
