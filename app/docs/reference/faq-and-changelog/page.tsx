import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { coreEngineRepoPublic, coreEngineRepoUrl } from '@/lib/siteConfig';

export const metadata: Metadata = pageSeo({
  title: 'FAQ & changelog: docs, API and release versions',
  description:
    "Frequently asked questions about WarmHawk's docs and API, plus what has shipped in each repo, with each package's real release versions.",
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
      'Below on this page. warmhawk-core-engine and the licensed dashboard ship tagged, semver releases, and this page summarizes the latest of each. warmhawk-core-engine is source-available (BSL 1.1), so its CHANGELOG.md links through; the dashboard and this site are proprietary, so the summaries here are the changelog for those two.',
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
  /** The latest tagged release, or how the repo ships when it has no tags. */
  release: string;
  tagged: boolean;
  summary: string;
  highlights: string[];
}

const changelog: ChangelogEntry[] = [
  {
    repo: 'warmhawk-core-engine',
    // The open-core half (BSL 1.1, public at go-live) — the one repo whose CHANGELOG.md a reader
    // can open, and only once CORE_ENGINE_REPO_PUBLIC says so.
    repoUrl: coreEngineRepoPublic ? `${coreEngineRepoUrl}/blob/main/CHANGELOG.md` : undefined,
    release: 'v1.9.1 · Oct 4, 2026',
    tagged: true,
    summary:
      'The sending/queueing API, worker, and install.sh. Tagged semver releases since v1.0.0; warmhawk update moves an install to the newest one.',
    highlights: [
      'v1.9.1: deleting a mailbox ends the follow-up sequences of the leads it was sending to, and install and update retry listing the n8n workflows before skipping their import.',
      'v1.9.0: a mailing address per sending domain, each campaign picks the mailboxes it sends from, and follow-up sequences (up to three, same mailbox, same thread). Launch returns every problem at once; GET /v1/campaigns/:id/launch-check runs the same check without launching. PATCH /v1/campaigns/:id now refuses status, and PUT /v1/instance-settings returns 410.',
      'v1.8.0: a built-in unsubscribe page for campaigns with no unsubscribe link of their own.',
      'v1.5.0: WarmHawk Connect, one-click Google and Microsoft mailbox connect.',
      'v1.3.0: the warm-up engine, with placement checks and test inboxes.',
      'v1.0.0: Fastify API + BullMQ worker, cadence/jitter math, Redis AOF durability + crash recovery, CSV import, BYOK AI personalization, reply management, every structural guardrail, and the bundled nginx/certbot/Uptime Kuma/OTEL stack.',
    ],
  },
  {
    repo: 'warmhawk-enterprise-operator',
    release: 'v1.18.0 · Oct 4, 2026',
    tagged: true,
    summary:
      'The licensed Tier 1/2 operator dashboard. Tagged semver releases; its update banner compares your version against the newest one.',
    highlights: [
      'v1.18.0: agency client filter, search and pagination; tables grow with the page; the Compliance settings page is gone, since mailing addresses now live on each domain.',
      'v1.17.0: a new campaigns table and 4-step builder (Write, Send from, Leads, Launch check) with follow-ups, an import wizard, a mailing address per domain, a DKIM selector per domain, and a required sender name per mailbox.',
      'v1.16.0: the unsubscribe link is optional when the engine serves its own unsubscribe page.',
      'v1.0.0: Next.js dashboard with its own Postgres, tier-based feature gating, team invite/remove, TOTP 2FA, an onboarding checklist, and the leads, campaigns, domain health, Unified Reply Inbox and live queue pages.',
      // Was "Known, tracked gap: transactional email for team invites is stubbed to console log
      // pending a provider decision." — untrue since BYO-SMTP shipped, and a bad thing to leave on
      // a public docs page: it tells a prospective buyer a feature they're paying for is broken.
      'Team invites send over your own SMTP server (any provider — no SDK, no vendor lock-in). With SMTP left unconfigured the invite still works: the dashboard says plainly that nothing was emailed and hands you a copyable accept link to pass along yourself.',
    ],
  },
  {
    repo: 'warmhawk-site',
    release: 'Deployed continuously',
    tagged: false,
    summary:
      'This marketing/docs/checkout site. It has no version numbers: each change goes live once it passes review.',
    highlights: [
      'Homepage, all /vs/* comparison pages, /compare/pricing, /tools/domain-check, /status, /security, /legal/*.',
      'Stripe Checkout session, webhook, and Customer Portal routes for Tier 1; sitemap/robots/OG/Twitter/FAQPage schema site-wide.',
      'This docs section, restructured into the current 15-page information architecture; a real Tier 2 contact-sales flow and dedicated /checkout route.',
      'Docs for the v1.9.0 engine: mailing address per domain, campaign senders and follow-ups, the launch check, and the matching openapi.json.',
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
        then summarizes what each repo has shipped. The engine (v1.9.1) and the dashboard (v1.18.0)
        ship tagged semver releases; this site deploys continuously without version numbers. Every
        version and date below is a real release.
      </AnswerBlock>

      <FaqSection items={faqItems} title="Questions worth answering up front" />

      <div className="pt-14">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold mb-3">Changelog</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-8">
          This site doesn&rsquo;t own the product changelog. Each package ships and maintains its
          own <code className="font-mono text-sm">CHANGELOG.md</code>, versioned alongside its code,
          summarized here. <strong>warmhawk-core-engine</strong> is source-available (BSL 1.1) and
          its file links through; the licensed dashboard and this site are proprietary, so their
          summaries below <em>are</em> the changelog. Each card shows the newest release and its
          headline changes.
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
                  <span className={`badge ${entry.tagged ? 'badge-pass' : 'badge-unconfigured'}`}>
                    {entry.release}
                  </span>
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
