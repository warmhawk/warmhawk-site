import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';

// Every non-WarmHawk fact on this page is sourced from the project's own site, GitHub repo,
// README, or license file, checked September 2026 — see the inline citations below and the
// research this page was built from (WebFetch on each project's site/README, GitHub API for star
// counts and license). Star counts move; they're dated inline rather than stated as permanent.
// WarmHawk's own claims are pulled only from what warmhawk-site already states elsewhere
// (app/page.tsx, app/compare/pricing/page.tsx, app/docs/introduction/page.tsx,
// app/docs/quickstart/page.tsx) — nothing new is asserted about WarmHawk here.
interface ToolRow {
  name: string;
  type: string;
  license: string;
  stars: string;
  warmup: string;
  rotation: string;
  replyHandling: string;
}

const toolRows: ToolRow[] = [
  {
    name: 'WarmHawk',
    type: 'Cold-outreach sending engine',
    license: 'BSL 1.1 (source-available)',
    stars: 'Not public on GitHub',
    warmup: 'Yes — automated, per-mailbox',
    rotation: 'Yes — weighted, capacity-aware',
    replyHandling: 'Unified Reply Inbox (Tier 1/2)',
  },
  {
    name: 'Warmbly',
    type: 'Cold-outreach + light CRM',
    license: 'Apache 2.0',
    stars: '~340',
    warmup: 'Yes — own-mailbox pool',
    rotation: 'Yes — across connected mailboxes',
    replyHandling: 'Unified inbox + AI triage + CRM',
  },
  {
    name: 'Quickly',
    type: 'Cold-outreach sending engine',
    license: 'MIT',
    stars: '~40',
    warmup: 'Yes — built-in ramp + jitter',
    rotation: 'Yes — Gmail/Microsoft 365 OAuth',
    replyHandling: 'Unified inbox + AI classification',
  },
  {
    name: 'Mautic',
    type: 'Marketing automation (newsletter)',
    license: 'GPLv3',
    stars: '~10,600',
    warmup: 'No',
    rotation: 'No',
    replyHandling: 'No cold-outreach reply triage',
  },
  {
    name: 'listmonk',
    type: 'Newsletter / mailing-list manager',
    license: 'AGPL-3.0',
    stars: '~23,600',
    warmup: 'No',
    rotation: 'No',
    replyHandling: 'One-way sends only',
  },
  {
    name: 'Postal',
    type: 'Raw mail transfer agent (MTA)',
    license: 'MIT',
    stars: '~16,800',
    warmup: 'No',
    rotation: 'No',
    replyHandling: 'No — delivery pipes only, no app layer',
  },
  {
    name: 'BillionMail',
    type: 'Mailserver + newsletter/marketing UI',
    license: 'AGPL-3.0',
    stars: '~15,800',
    warmup: 'No',
    rotation: 'No',
    replyHandling: 'No cold-outreach reply triage',
  },
  {
    name: 'Sendy',
    type: 'Newsletter sender (on Amazon SES)',
    license: 'Proprietary — $69 one-time',
    stars: 'N/A — closed source',
    warmup: 'No',
    rotation: 'No',
    replyHandling: 'No cold-outreach reply triage',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'Self-Hosted Cold Email Software: 7 Options (2026)',
  description:
    'A sourced comparison of Warmbly, Quickly, Mautic, listmonk, Postal, BillionMail and Sendy for self-hosted cold email, plus where WarmHawk fits.',
  path: '/alternatives/self-hosted-cold-email',
});

const faqItems = [
  {
    question: 'What is the best open-source Instantly alternative?',
    answer:
      'Among genuinely OSI open-source options, Warmbly (Apache 2.0, github.com/warmbly/warmbly) is the closest full-featured match — it does campaigns, warmup, reply triage, and a built-in CRM, with a free self-hosted option. Quickly (MIT license) is a lighter, earlier-stage option focused on Gmail/Microsoft 365 OAuth sending. WarmHawk is source-available under the Business Source License, not OSI open source, but is purpose-built for single-tenant self-hosting with a flat monthly fee.',
  },
  {
    question: 'Can I use Mautic, listmonk, or Sendy for cold outreach?',
    answer:
      'Not well. All three are built for sending to lists of people who already opted in — newsletters and lifecycle marketing — not cold prospecting. None of them does mailbox warmup, mailbox rotation, or the reply-triage and sending-safety guardrails a cold-outreach tool needs, and using them for unsolicited cold email risks the sending domain’s reputation and, depending on your jurisdiction, compliance exposure.',
  },
  {
    question: 'Is Postal a cold email tool?',
    answer:
      'No. Postal is a raw mail transfer agent (MTA) — it handles SMTP delivery for incoming and outgoing mail, full stop. It has no campaigns, sequencing, warmup, or lead management built in; you would need to build all of that yourself on top of it, the way any of the other tools on this page already have.',
  },
  {
    question: 'Which of these are actually free to self-host?',
    answer:
      'WarmHawk (BSL 1.1), Warmbly (Apache 2.0), Quickly (MIT), Mautic (GPLv3), listmonk (AGPL-3.0), Postal (MIT), and BillionMail (AGPL-3.0) are all free to self-host under their respective licenses. Sendy is the exception: it’s self-hosted on your own server, but the software itself is a proprietary one-time $69 license, not a free or open-source one.',
  },
  {
    question: 'Which of these actually do mailbox warmup?',
    answer:
      'WarmHawk, Warmbly, and Quickly all ship warmup as a built-in feature. Mautic, listmonk, Postal, BillionMail, and Sendy do not — they’re not built for cold outreach in the first place, so warming a mailbox’s reputation before sending isn’t a problem any of them try to solve.',
  },
];

export default function SelfHostedColdEmailAlternativesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />

      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-14 md:pb-16">
        <div className="label text-rust mb-5">Self-Hosted Cold Email Software</div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          Self-Hosted Cold Email Software: 7 Alternatives Compared (2026)
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-9">
          &ldquo;Self-hosted cold email&rdquo; and &ldquo;self-hosted email&rdquo; turn up a lot of
          projects that aren&rsquo;t actually built for cold outreach — newsletter platforms,
          mailing list managers, and raw mail servers that happen to send email but have no idea
          what a sequence, a warmup ramp, or a reply-triage inbox is. This page sorts seven real
          projects into what they actually are, honestly, including where WarmHawk (our own product)
          isn&rsquo;t the best fit.
        </p>
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link href="/checkout?tier=1" className="btn btn-primary">
            Start Tier 1 &mdash; $199/mo
          </Link>
          <Link href="/docs/quickstart" className="btn btn-ghost">
            Get the free engine
          </Link>
        </div>
        <AnswerBlock>
          For self-hosted, open-source cold outreach specifically, Warmbly (Apache 2.0) and Quickly
          (MIT) are the two purpose-built options, alongside WarmHawk (source-available, BSL 1.1).
          Mautic, listmonk, and Sendy are newsletter/marketing tools, not cold-outreach engines.
          Postal is a raw mail transfer agent with no campaign layer at all. BillionMail bundles a
          mailserver with a basic marketing UI, not cold-outreach-specific tooling.
        </AnswerBlock>
      </div>

      {/* SUMMARY TABLE */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-3">
            All 8, side by side
          </h2>
          <p className="text-center text-ink-muted text-base mb-10 max-w-2xl mx-auto">
            License and star counts checked September 2026; both move over time.
          </p>
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[880px]">
              <thead>
                <tr>
                  <th className="label text-left p-5 text-ink-muted font-semibold">Tool</th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    What it is
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    License
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    GitHub stars
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    Warmup
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    Mailbox rotation
                  </th>
                  <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                    Reply handling
                  </th>
                </tr>
              </thead>
              <tbody>
                {toolRows.map((row) => (
                  <tr
                    key={row.name}
                    className={row.name === 'WarmHawk' ? 'bg-rust-tint/40' : undefined}
                  >
                    <td className="p-5 border-t border-border align-top font-semibold text-ink">
                      {row.name}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.type}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.license}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.stars}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.warmup}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.rotation}
                    </td>
                    <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                      {row.replyHandling}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAILED CARDS */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-10">
          Each one, in detail
        </h2>
        <div className="grid gap-6 max-w-3xl mx-auto">
          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              WarmHawk &mdash; cold-outreach sending engine (our own product)
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              Self-hosted cold-email infrastructure: your own containers, database, nginx, and TLS
              certificate, with a jittered, capacity-aware send queue, automated per-mailbox warmup,
              and BYOK Gemini/Claude AI personalization. Licensed under the Business Source License
              1.1 &mdash; source-available, not OSI open source, converting to Apache 2.0 four years
              after each release. Free as a Tier 0 API-only engine, or $199/mo flat for the operator
              dashboard with unlimited mailboxes and users. Best fit: teams that want infrastructure
              ownership and flat pricing and are fine with a source-available (not fully open)
              license.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              Warmbly &mdash; cold-outreach + light CRM
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="warmbly.com, github.com/warmbly/warmbly, September 2026">
                Apache 2.0 licensed with roughly 340 GitHub stars
              </StatCite>
              . Campaigns, own-mailbox-pool warmup, a unified inbox with AI reply classification,
              and a built-in CRM (contacts, pipelines, deals, tasks). Free to self-host, or hosted
              from $23/mo (150 emails/day) up to $263/mo (15,000/day); the free hosted plan covers
              up to 10 mailboxes and warmup only, with sending and the CRM locked until upgrade.
              Best fit: teams wanting a fully open-source cold-outreach tool with CRM features built
              in, self-hosted or hosted.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              Quickly &mdash; cold-outreach sending engine
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="github.com/AbdelftahZowail/Quickly, September 2026">
                MIT licensed, roughly 40 GitHub stars
              </StatCite>
              . Sends through Gmail and Microsoft 365&rsquo;s own OAuth2 APIs rather than shared
              SMTP, with inbox rotation across unlimited connected mailboxes, built-in warmup
              ramp-up with send-time jitter, and AI reply classification across 19 providers
              (including offline Ollama). Self-hosted only, via Docker Compose or Railway. Best fit:
              a solo operator or small team comfortable running an early-stage, small-community
              project in exchange for a free, MIT-licensed engine.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              Mautic &mdash; marketing automation, not cold outreach
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="GitHub API, September 2026">
                GPLv3 licensed, roughly 10,600 GitHub stars
              </StatCite>
              . A full marketing-automation platform &mdash; lead scoring, drip campaigns, landing
              pages &mdash; built for lifecycle marketing to contacts who already opted in. No
              mailbox warmup, no rotation, and no cold-outreach-specific reply triage or send-safety
              guardrails. Poor fit for cold outreach; a strong fit if what you actually need is
              inbound/lifecycle marketing automation.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              listmonk &mdash; newsletter and mailing-list manager, not cold outreach
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="GitHub API, September 2026">
                AGPL-3.0 licensed, roughly 23,600 GitHub stars
              </StatCite>
              . A high-performance, single-binary newsletter and mailing-list sender for lists
              people have subscribed to &mdash; not sequences, not warmup, not two-way reply
              handling. Poor fit for cold outreach; a strong fit for sending newsletters to a
              subscribed list cheaply and reliably.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              Postal &mdash; a raw mail transfer agent, not an outreach tool
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="GitHub API, September 2026">
                MIT licensed, roughly 16,800 GitHub stars
              </StatCite>
              , describing itself as &ldquo;a fully featured open source mail delivery platform for
              incoming &amp; outgoing e-mail.&rdquo; It&rsquo;s SMTP delivery infrastructure &mdash;
              no campaigns, sequencing, warmup, or lead management at all. Postal is what
              you&rsquo;d run underneath a tool you build yourself, not a cold-outreach tool on its
              own. Best fit: engineers who want to own the delivery pipes and build outreach logic
              on top from scratch.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              BillionMail &mdash; mailserver + marketing UI, not cold outreach
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="GitHub API, September 2026">
                AGPL-3.0 licensed, roughly 15,800 GitHub stars
              </StatCite>
              . Bundles a real self-hosted mail server with a newsletter/email-marketing UI &mdash;
              analytics, templates, unlimited sending &mdash; aimed at replacing tools like
              Mailchimp or Brevo, not Instantly or Smartlead. No mailbox warmup, rotation, or
              cold-outreach reply triage. Best fit: teams wanting a self-hosted mail server bundled
              with basic marketing campaigns, not dedicated cold-outreach tooling.
            </p>
          </div>

          <div className="card bg-cream p-7">
            <div className="font-semibold text-base mb-2.5">
              Sendy &mdash; a newsletter sender, and not free
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              <StatCite source="sendy.co, September 2026">
                a proprietary, one-time $69 license
              </StatCite>{' '}
              (source visible after purchase, not open source) for a self-hosted PHP app that sends
              through your own Amazon SES account, at roughly $1 per 10,000 emails. It&rsquo;s
              explicitly built for newsletters and marketing email to opted-in lists, not cold
              outreach, and it isn&rsquo;t self-hosted-free the way the rest of this list is &mdash;
              you pay for the license even though you host it yourself. No warmup, rotation, or
              cold-outreach reply handling.
            </p>
          </div>
        </div>
      </div>

      <FaqSection
        items={faqItems}
        title="Self-hosted cold email software: questions worth answering up front"
      />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            If it&rsquo;s actually cold outreach you&rsquo;re building, pick a tool built for it.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            Self-hosted, single-tenant, flat $199/mo &mdash; free to try the API for $0.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/checkout?tier=1" className="btn btn-primary">
              Start Tier 1 &mdash; $199/mo
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
