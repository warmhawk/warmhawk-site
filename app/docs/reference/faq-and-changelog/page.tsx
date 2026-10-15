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
    release: 'v1.22.0 · Oct 15, 2026',
    tagged: true,
    summary:
      'The sending/queueing API, worker, and install.sh. Tagged semver releases since v1.0.0; warmhawk update moves an install to the newest one.',
    highlights: [
      'v1.22.0: GET /v1/queue/status adds today to expectedByDay (what is still to come, from each mailbox’s cap less what it sent or booked, inside each campaign’s send hours), offDays (days no active campaign sends on) and failedToday (campaign emails that failed since midnight UTC). Setting a mailbox back to Active clears its bounce-limit flag.',
      'v1.21.0: an optional check before a lead’s first email (ADDRESS_CHECK_HELO). The worker asks the lead’s mail server whether the mailbox exists, without sending anything, and stops a dead address as FAILED before it can bounce. The mailbox gets that slot back for its next lead.',
      'v1.20.0: delivery-failure reports are recorded as BOUNCED replies. GET /v1/replies/waiting-count counts replies still waiting on you, PATCH /v1/replies/:id marks one handled, and GET /v1/version reports the engine’s release.',
      'v1.19.0: GET /v1/queue/status adds expectedByDay, what active campaigns are expected to send on each of the next 7 days, and an expected count on each mailbox day ahead. The queue only holds each mailbox’s next email, so queued alone read 0 for days ahead.',
      'v1.18.0: GET /v1/queue/status adds queuedByDay, every queued email counted by the day it is due, not only the first 50. Its waiting, active and delayed counts leave out the nightly system job, so an empty queue reads 0.',
      'v1.17.0: GET /v1/queue/jobs lists every queued email, soonest first, by mailbox or day. GET /v1/queue/status adds sends by day, each mailbox’s sent, warm-up, queued and cap counts, and the real gap between sends (minGapSeconds, maxGapSeconds). POST /v1/campaigns/preview takes a leadId and skipAi, and says whether AI writes that email (usesAi).',
      'v1.16.0: a send schedule per campaign (days, hours and a time zone, or each lead’s own time zone, plus an optional cap on new leads per day). The daily limit is spread across the open hours, follow-ups go before new leads, and the daily limit is a rolling 24-hour count. GET /v1/campaigns returns sendWindow and nextSendAt. Existing campaigns keep sending at any hour.',
      'v1.15.0: a campaign with nothing left to send marks itself Completed, and goes back to sending when it gets new leads or follow-ups.',
      'v1.14.0: campaign progress lists the follow-ups sent per step (followUpsSent) and the ones still coming (upcomingFollowUps).',
      'v1.13.0: PATCH /v1/leads/:id edits a lead before it is emailed, keeping its place in the send order. v1.13.1: lead and blocked-list search treat % and _ as plain text, and the footer prints the country on the city line.',
      'v1.12.3: warm-up spreads its sends (no two emails to one inbox within 5 minutes, mailboxes take turns, no subject reused within 3 days) and records Gmail Promotions-tab landings. v1.12.4: a Google token refresh retries once after a network blip.',
      'v1.12.1–v1.12.2: saving an AI key tests the chosen model; AI Adjusts and AI Writes now differ and keep your links, prices and greeting; new fallback reasons quota_exceeded and content_dropped; a test email’s unsubscribe link unsubscribes nobody.',
      'v1.12.0: SMTP and IMAP sign-in are checked before a mailbox is saved, and failed requests answer with a plain sentence instead of the raw error.',
      'v1.11.0: opt-out replies are caught without an AI key; personal mailboxes (Gmail, Yahoo, Outlook.com); the blocked-list API (/v1/suppression); POST /v1/campaigns/:id/duplicate.',
      'v1.10.0–v1.10.2: merge-field fallbacks ({{firstName|there}}); a blank or unknown merge field now blocks launch; field names ignore capitals and underscores.',
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
    release: 'v1.35.0 · Oct 15, 2026',
    tagged: true,
    summary:
      'The licensed Tier 1/2 operator dashboard. Tagged semver releases; its update banner compares your version against the newest one.',
    highlights: [
      'v1.35.0: Live Queue’s Sent today and Failed today count today’s campaign emails, not the queue’s job records. Today’s bar and each mailbox’s today cell add what’s still expected today, and a day no campaign sends on reads Off (with engine v1.22.0). The Campaigns table’s Sends from adds each sending mailbox’s warm-up stage beside the mailbox count.',
      'v1.34.0: a campaign stopped by its bounce rate shows Stopped: bounces and a Resume button. The dashboard’s alerts open that campaign’s panel or that mailbox’s Edit dialog. A bounced reply has no Suppress lead, so it stays in the bounce rate.',
      'v1.32.0–v1.33.1: Replies shows bounces, the sending mailbox and what happens next, with Mark handled; the sidebar counts replies waiting on you and names the engine version; the Live Queue says why its panel is empty.',
      'v1.31.0: Live Queue shows what each day ahead is expected to send, in the chart and the per-mailbox table (with engine v1.19.0). Sent is green, queued rust and expected a dashed amber.',
      'v1.30.0: Live Queue lists each mailbox’s campaigns one per line, puts mailboxes with a running campaign first and then warming ones by warm-up day, and charts every queued email by day (with engine v1.18.0).',
      'v1.29.0: Live Queue opens a side panel of every queued email, grouped by day; open one to read that lead’s emails, one tab per step. A per-mailbox table shows sent, queued and cap two days either side of today. The campaign builder has a Save that’s always on screen, with Discard and Ctrl+S, and nothing saves on blur.',
      'v1.28.0: pick when a campaign sends (days, hours and time zone) under Send from; new campaigns start at Monday to Friday, 9 to 5, in your time zone.',
      'v1.25.0–v1.27.0: edit a lead before it is emailed; Sent today is measured against today’s limit; a campaign’s follow-ups split into Sequence, Follow-ups sent and Next follow-ups; Completed campaigns show as done.',
      'v1.23.0–v1.24.0: a step-by-step guide for your own Google or Microsoft OAuth app; the AI modes differ visibly and say when the AI failed; warm-up shows Promotions-tab landings.',
      'v1.21.0–v1.22.0: a Blocked list page, duplicate campaigns, personal mailboxes, plain-sentence error popups, and an SMTP form that checks the sign-in.',
      'v1.19.0–v1.20.0: unfilled merge fields show as launch blockers; delete a campaign from its row, side panel or builder.',
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
      'This docs section, restructured into a 15-page information architecture (16 with the Warm-up guide); a real Tier 2 contact-sales flow and dedicated /checkout route.',
      'Docs for the v1.22.0 engine: today’s expected sends, offDays and failedToday on GET /v1/queue/status, and the Live Queue stat cards and Off days.',
      'Docs for the v1.21.0 engine: checking an address before the first email, in Sending safely.',
      'Docs for the v1.19.0 engine: expectedByDay and the expected sends on the Live Queue.',
      'Docs for the v1.18.0 engine: queuedByDay, queue counts without the nightly system job, and the Live Queue table order.',
      'Docs for the v1.17.0 engine: the Live Queue side panel, GET /v1/queue/jobs, the real gap between sends, preview by lead, and saving in the campaign builder.',
      'Docs for the v1.16.0 engine: send schedules, merge-field fallbacks, AI modes, preview and test send, duplicate, the blocked list, lead edits and a new Warm-up guide, with the matching openapi.json.',
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
        then summarizes what each repo has shipped. The engine (v1.19.0) and the dashboard (v1.31.0)
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
