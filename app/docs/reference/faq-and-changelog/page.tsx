import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { coreEngineRepoPublic, coreEngineRepoUrl } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'FAQ & changelog',
  description:
    'Frequently asked questions about WarmHawk’s docs and API, plus what’s actually shipped so far in each repo — pulled straight from each package’s own CHANGELOG.md, no invented version numbers.',
  path: '/docs/reference/faq-and-changelog',
});

const faqItems = [
  {
    question: 'Where do I start if I’ve never used WarmHawk’s API before?',
    answer:
      'Quickstart & installation. It walks through installing the stack and a real send in six curl calls, start to finish, in about 5 minutes.',
  },
  {
    question: 'My install.sh run failed — where do I look first?',
    answer:
      'install.sh troubleshooting covers the three most common causes: Docker/Compose missing, ports 80/443 already bound, and DNS that hasn’t propagated yet. Most failures are one of those three.',
  },
  {
    question: 'Is there a full API reference?',
    answer:
      'Yes — API reference documents the real, current shape of every /v1 route across three pages (Auth & mailboxes, Leads & campaigns, Queue/domains/webhooks), field by field, matching what’s actually shipped in warmhawk-core-engine today.',
  },
  {
    question: 'Where’s the product changelog?',
    answer:
      'Below on this page. Each of the three packages maintains its own CHANGELOG.md versioned alongside its code, and this page summarizes all three. warmhawk-core-engine is open source, so its file links through; the licensed dashboard and this site are proprietary, so the summaries here are the changelog for those two.',
  },
  {
    question: 'Are there outbound webhooks I can register for events?',
    answer:
      'Not yet — see the Planned notice on the Queue, domains & webhooks API reference page. Poll the relevant GET route instead until that ships.',
  },
];

interface ChangelogEntry {
  repo: string;
  /**
   * Set only for a repo an anonymous reader can actually open. `warmhawk-enterprise-operator` and
   * `warmhawk-site` are proprietary and stay private permanently, so linking their CHANGELOG.md
   * served GitHub's 404 page — found in the 2026-08-30 go-live link crawl. Their summaries below
   * are the changelog for those two; there is no file to go read.
   */
  repoUrl?: string;
  summary: string;
  highlights: string[];
}

const changelog: ChangelogEntry[] = [
  {
    repo: 'warmhawk-core-engine',
    // The open-core half (BSL 1.1, public at go-live) — the one repo whose CHANGELOG.md a reader
    // can open, and only once CORE_ENGINE_REPO_PUBLIC says so.
    repoUrl: coreEngineRepoPublic ? `${coreEngineRepoUrl}/blob/main/CHANGELOG.md` : undefined,
    summary:
      'The sending/queueing API, worker, and install.sh — pre-1.0, everything below is still Unreleased in this repo’s own CHANGELOG.',
    highlights: [
      'Seed-Inbox Placement Test: SeedAccount/SeedPlacementResult models, GET/POST/PATCH/DELETE /seed-accounts, GET /domains/:id/placement-sample.',
      'Real n8n dispatch/reply-poll workflows calling this repo’s own internal API exclusively; POST /internal/mail/send enforces CAN-SPAM, RFC 8058, the EU AI disclosure marker, and the placement-test BCC hook.',
      'Foundation build: Fastify API + BullMQ worker, Prisma schema, cadence/jitter math, Redis AOF durability + crash-recovery reconciliation, CSV import, BYOK AI personalization, reply management, every structural guardrail, Google/Microsoft OAuth, containerization with bundled nginx/certbot/Uptime Kuma/OTEL.',
    ],
  },
  {
    repo: 'warmhawk-enterprise-operator',
    summary:
      'The licensed Tier 1/2 operator dashboard — also pre-1.0, Unreleased in its own CHANGELOG.',
    highlights: [
      'Initial scaffold: Next.js dashboard, its own Postgres, LicenseGate with tier-based feature gating, team invite/remove, TOTP 2FA, onboarding checklist, leads/campaigns/domain-health/Unified Reply Inbox/live queue inspector pages.',
      // Was "Known, tracked gap: transactional email for team invites is stubbed to console log
      // pending a provider decision." — untrue since BYO-SMTP shipped, and a bad thing to leave on
      // a public docs page: it tells a prospective buyer a feature they're paying for is broken.
      'Team invites send over your own SMTP server (any provider — no SDK, no vendor lock-in). With SMTP left unconfigured the invite still works: the dashboard says plainly that nothing was emailed and hands you a copyable accept link to pass along yourself.',
    ],
  },
  {
    repo: 'warmhawk-site',
    summary: 'This marketing/docs/checkout site — also pre-1.0, Unreleased.',
    highlights: [
      'Homepage, all /vs/* comparison pages, /compare/pricing, /tools/domain-check, /status, /security, /legal/*.',
      'Stripe Checkout session, webhook, and Customer Portal routes for Tier 1; sitemap/robots/OG/Twitter/FAQPage schema site-wide.',
      'This docs section, restructured into the current 15-page information architecture; a real Tier 2 contact-sales flow and dedicated /checkout route.',
    ],
  },
];

export default function FaqAndChangelogPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">Docs / Reference / FAQ &amp; changelog</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Questions worth answering up front, and what actually shipped.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        WarmHawk is self-hosted, so most of what goes wrong is something you can see and fix on your
        own server in a few minutes. This page rounds up the questions that come up before someone
        even starts, and what each of the three repos has actually shipped so far.
      </p>
      <AnswerBlock>
        This page answers the most common orientation questions about WarmHawk&rsquo;s docs and API,
        then summarizes each repo&rsquo;s real CHANGELOG.md. All three repos are pre-1.0 today —
        every entry below is still under each repo&rsquo;s own &ldquo;Unreleased&rdquo; heading, not
        a tagged release, and this page doesn&rsquo;t invent version numbers or dates that
        don&rsquo;t exist yet.
      </AnswerBlock>

      <FaqSection items={faqItems} title="Questions worth answering up front" />

      <div className="pt-14">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-3">Changelog</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-8">
          This site doesn&rsquo;t own the product changelog. Each package ships and maintains its
          own <code className="font-mono text-sm">CHANGELOG.md</code>, versioned alongside its code,
          summarized here. <strong>warmhawk-core-engine</strong> is open source (BSL 1.1) and its
          file links through; the licensed dashboard and this site are proprietary, so their
          summaries below <em>are</em> the changelog. None of the three has cut a tagged release
          yet, so there are no version numbers to show; what follows is each repo&rsquo;s current{' '}
          <code className="font-mono text-sm">[Unreleased]</code> section.
        </p>
        <div className="space-y-6 max-w-3xl">
          {changelog.map((entry) => (
            <div key={entry.repo} className="card bg-cream-elevated p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h3 className="font-display text-lg font-semibold">
                  {entry.repoUrl ? (
                    <a href={entry.repoUrl} className="text-rust">
                      {entry.repo}
                    </a>
                  ) : (
                    <span className="font-mono text-[15px]">{entry.repo}</span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {!entry.repoUrl && (
                    <span className="label text-[10px] px-2.5 py-1 border border-ink/15 rounded-full text-ink-muted">
                      Source not public
                    </span>
                  )}
                  <span className="badge badge-pending">Unreleased</span>
                </div>
              </div>
              <p className="text-[14px] leading-relaxed text-ink-muted mb-4">{entry.summary}</p>
              <ul className="list-disc pl-6 space-y-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted mt-6 max-w-2xl">
          Before running <code className="font-mono">warmhawk update</code> on a production
          instance, read the relevant CHANGELOG for breaking changes and new required environment
          variables — see the pre-update checklist in{' '}
          <Link href="/docs/update-failures" className="text-rust font-semibold">
            warmhawk update failures
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
