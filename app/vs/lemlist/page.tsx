import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, softwareApplicationSchema } from '@/lib/seo';
import { FaqSection } from '@/components/FaqSchema';
import { ComparisonCallout } from '@/components/ComparisonCallout';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { CompareTable, type CompareRow } from '@/components/CompareTable';

const compareRows: CompareRow[] = [
  {
    label: 'Pricing model',
    them: 'Per-seat, scales with team size',
    us: 'Flat $199/mo, unlimited users',
  },
  {
    label: 'Product scope',
    them: 'Sequencing + CRM-lite + database + editor + pages',
    us: 'Sending & deliverability only',
  },
  {
    label: 'Warmup',
    them: 'Lemwarm, separate paid add-on',
    us: 'Native, included',
  },
  {
    label: 'Send safety',
    them: 'Volumes reported as unsafe on new domains',
    us: '8-min cadence floor + jitter, enforced automatically',
  },
];

export const metadata: Metadata = pageSeo({
  title: 'WarmHawk vs Lemlist — Flat Pricing vs Per-Seat Cold Email Software',
  description:
    'Compare WarmHawk and Lemlist on pricing, feature focus, deliverability, and send safety. See why agencies move off per-seat SaaS onto one flat, self-hosted account fee.',
  path: '/vs/lemlist',
});

const faqItems = [
  {
    question: "Does WarmHawk have anything like Lemlist's CRM or lead database?",
    answer:
      'No, and that’s deliberate. WarmHawk stays a sending and deliverability engine. If you want a CRM, use one you already trust and connect it by webhook — WarmHawk won’t try to replace it.',
  },
  {
    question: 'Is warmup included with WarmHawk, or is it a paid add-on like Lemwarm?',
    answer:
      'Included, for every connected mailbox, from day one. There is no separate warmup product or subscription to buy on top of your WarmHawk account.',
  },
  {
    question: 'How does WarmHawk pricing compare to Lemlist as my team grows?',
    answer:
      'WarmHawk is a flat $199/mo per account with unlimited users. Add five teammates or fifty — the invoice doesn’t move, unlike Lemlist’s per-seat pricing.',
  },
  {
    question: 'Will WarmHawk push a brand-new domain too hard, like Lemlist reviews describe?',
    answer:
      "No. computeNextSlotSeconds.ts enforces an eight-minute cadence floor plus jitter on every mailbox automatically — there's no setting that lets a new domain exceed a safe sending rate.",
  },
  {
    question: 'Can I migrate my Lemlist sequences and leads to WarmHawk?',
    answer:
      'Yes. CSV import and webhook ingestion both work day one, and the Enterprise DFY tier includes white-glove migration if you’d rather not do it yourself.',
  },
];

export default function LemlistComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />
      {/* HERO */}
      <div className="wrap pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <div className="label text-rust mb-5">WarmHawk vs Lemlist</div>
            <h1 className="font-display text-4xl md:text-[50px] leading-tight font-semibold mb-6">
              Lemlist bills you per seat. WarmHawk bills the account &mdash; once.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-lg mb-9">
              WarmHawk and Lemlist solve the same problem &mdash; cold email that actually lands
              &mdash; from opposite directions. Lemlist grew into a sequencing tool wrapped in a
              CRM-lite, a lead database, an image editor, and landing pages, priced per seat on
              shared servers &mdash; and still sells deliverability warmup (Lemwarm) as a separate
              paid add-on. WarmHawk stayed a single-tenant sending and deliverability engine with
              warmup native and included, installed on infrastructure you own, for one flat fee no
              matter how many people on your team log in.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/checkout?tier=1" className="btn btn-primary">
                Start Tier 1 &mdash; $199/mo
              </Link>
              <Link href="/compare/pricing" className="btn btn-ghost">
                See full pricing
              </Link>
            </div>
          </div>

          <div className="card p-7">
            <div className="label text-ink-muted mb-5">WarmHawk vs Lemlist, at a glance</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">Unlimited</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  seats, no per-user fee
                </div>
              </div>
              <div className="text-center border-l border-r border-border">
                <div className="font-display text-2xl font-bold text-rust">$199/mo</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">flat, per account</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-rust">0</div>
                <div className="text-xs text-ink-muted mt-1.5 leading-tight">
                  separate warmup subscriptions
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            Per-seat pricing punishes exactly the teams that need cold email most
          </h2>
          <AnswerBlock>
            Lemlist and Apollo price by seat, so cost climbs every time an agency adds a teammate, a
            client login, or a new hire &mdash; even though sending volume and mailbox count
            haven&rsquo;t changed. WarmHawk charges one flat $199 per month per account, with
            unlimited users, so team growth never triggers a bigger invoice.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              Per-seat pricing looks reasonable at two or three logins. It stops looking reasonable
              the moment an agency onboards a client, brings on a contractor, or lets a second
              account manager into the workspace &mdash;{' '}
              <StatCite source="Cost analysis">
                every added seat is a recurring line item that has nothing to do with how much mail
                actually goes out
              </StatCite>
              . The incentive that creates is backwards: teams either under-staff the tool to
              protect margin, or pay a growing tax just for more people to see the same sending
              infrastructure.
            </p>
            <p>
              WarmHawk removes the variable entirely. One account, one flat fee, unlimited users
              &mdash; the client-facing agency running twelve seats pays the exact same $199/mo as
              the solo operator running one. Growth in headcount is no longer a pricing event, and{' '}
              <StatCite source="Cost analysis">
                the gap between a per-seat bill and a flat account fee only widens the longer an
                agency keeps growing its team
              </StatCite>
              .
            </p>
          </div>
        </div>
      </div>

      {/* FEATURE BLOAT */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          Feature bloat is exactly what you don&rsquo;t want in your sending tool
        </h2>
        <AnswerBlock>
          Lemlist bundles sequencing with a CRM-lite, a lead database, an image personalization
          editor, and landing pages &mdash; a lot of surface area for a tool whose only job is
          getting cold email delivered. WarmHawk deliberately stays narrow: sending, warmup,
          rotation, and deliverability data, nothing else to configure or ignore.
        </AnswerBlock>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            More surface area means more UI to learn, more settings that don&rsquo;t apply to your
            workflow, and more places a real problem can hide behind a feature you never asked for.{' '}
            <StatCite source="User reviews">
              Lemlist users describe the interface as cluttered once the CRM-lite, database, and
              editor modules are all switched on at once
            </StatCite>
            , even for teams that only ever wanted sequencing and inbox placement.
          </p>
          <p>
            WarmHawk is a non-goal-driven product in the best sense: it doesn&rsquo;t try to be your
            CRM, your lead database, or your landing-page builder. It sends mail, warms mailboxes,
            rotates load safely across them, and shows you where messages actually land. That focus
            is the product, not a limitation of it.
          </p>
        </div>
      </div>

      {/* LEMWARM ADD-ON */}
      <div className="border-t border-b border-border bg-cream-elevated">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
            Warmup should not be a separate subscription
          </h2>
          <AnswerBlock>
            Lemwarm sits behind its own paywall, so Lemlist customers pay twice &mdash; once for
            sequencing, again to warm the mailboxes those sequences depend on. WarmHawk builds
            warmup into the core product: every connected mailbox gets automatic, jittered warmup
            traffic from day one, at no extra cost, with no second subscription to manage.
          </AnswerBlock>
          <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              Warmup isn&rsquo;t a nice-to-have bolted onto sending &mdash; it&rsquo;s the
              precondition for sending to work at all. Charging for it separately turns a core
              dependency into an upsell.{' '}
              <StatCite source="User reviews">
                Reviewers regularly flag Lemwarm as an unexpected extra cost discovered only after
                signing up for Lemlist itself
              </StatCite>
              , which is a strange place to put a paywall for infrastructure the rest of the product
              can&rsquo;t function without.
            </p>
            <p>
              On WarmHawk, warmup is not a feature you toggle on for an extra fee &mdash; it&rsquo;s
              a background job that runs against every mailbox you connect, tuned automatically to
              that mailbox&rsquo;s age and sending history, included in the one price you already
              pay.
            </p>
          </div>
        </div>
      </div>

      {/* SEND VOLUME / CADENCE FLOOR */}
      <div className="wrap py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-[30px] font-semibold text-center mb-6">
          New domains get pushed too hard &mdash; until they don&rsquo;t
        </h2>
        <AnswerBlock>
          Reviewers describe Lemlist letting brand-new domains send at volumes that burn reputation
          before warmup finishes. WarmHawk&rsquo;s queue engine, computeNextSlotSeconds.ts, enforces
          an eight-minute cadence floor plus randomized jitter on every mailbox automatically
          &mdash; there&rsquo;s no setting to disable, so a new domain physically cannot be pushed
          past a safe sending rate.
        </AnswerBlock>
        <div className="max-w-3xl mx-auto space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            The most common way a cold-email tool damages an agency&rsquo;s client relationship
            isn&rsquo;t a bug &mdash; it&rsquo;s a default that&rsquo;s too aggressive for a mailbox
            that&rsquo;s two weeks old.{' '}
            <StatCite source="User reviews">
              users report Lemlist pushing new domains to daily volumes that outpace what their
              actual sending reputation can support
            </StatCite>
            , torching deliverability right at the moment a client is watching the results closest.
          </p>
          <p>
            WarmHawk removes the judgment call. computeNextSlotSeconds.ts calculates the minimum gap
            between sends per mailbox &mdash; never less than eight minutes, always with randomized
            jitter layered on top so outbound traffic doesn&rsquo;t look like a scripted drip
            &mdash; and enqueuer.ts spreads that load across every mailbox on the account by
            weighted, capacity-aware rotation. A brand-new domain simply cannot be rushed, by a
            client, an over-eager AE, or an impatient operator.
          </p>
        </div>

        <div className="mt-12">
          <CompareTable themLabel="Lemlist" rows={compareRows} />
        </div>
      </div>

      <div className="wrap">
        <ComparisonCallout />
      </div>

      <FaqSection items={faqItems} />

      {/* FINAL CTA */}
      <div className="bg-slate text-paper">
        <div className="wrap py-20 md:py-24 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            One tool. Not five, wearing a trenchcoat.
          </h2>
          <p className="text-lg text-slate-soft mb-9">
            A focused sending engine &mdash; warmup included, nothing bolted on.
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
