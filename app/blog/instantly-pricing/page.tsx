import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'instantly-pricing')!;

export const metadata: Metadata = pageSeo({
  title: post.metaTitle ?? post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question: 'Is Instantly too expensive for a solo sender?',
    answer:
      "Not usually. Instantly's cheapest Outreach plan (Growth, $47/month as of September 2026, per instantly.ai/pricing) includes unlimited mailboxes and warmup with 5,000 emails and 1,000 uploaded contacts a month — that covers most solo cold-email volume without needing a lead-database add-on at all.",
  },
  {
    question: 'Does Instantly charge per seat?',
    answer:
      "No — Instantly's plans meter by monthly email volume and uploaded contacts, not by number of team members with a login. The cost driver for a growing team is volume and lead-sourcing needs, not headcount directly, though both tend to grow together.",
  },
  {
    question: 'Is there a true one-time-payment cold email tool with no recurring fee?',
    answer:
      "Not really, anywhere in this category, and it's worth being honest about that rather than promising otherwise. Even WarmHawk's Tier 2, which has a genuine one-time $999 setup fee, still carries the same $199/month software fee every Tier 1 customer pays — infrastructure, support, and ongoing deliverability tooling have real ongoing cost, so no serious vendor (WarmHawk included) sells a lifetime license with zero recurring fee.",
  },
  {
    question:
      "What's the cheapest way to run cold email if I don't need Instantly's lead database?",
    answer:
      "If lead sourcing isn't the point — you already have your own list — a sending-only tool avoids paying for a database feature you won't use. WarmHawk's Tier 0 is a free, self-hosted sending engine (CSV import via API, no bundled lead database), and Tier 1 is $199/month flat with unlimited mailboxes and users if you want the dashboard on top.",
  },
];

export default function InstantlyPricingPost() {
  return (
    <>
      <div className="wrap py-16">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              blogPostingSchema({
                title: post.title,
                description: post.description,
                path: `/blog/${post.slug}`,
                datePublished: post.date,
              }),
            ),
          }}
        />
        <div className="label text-rust mb-5">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>{' '}
          / Pricing
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          Instantly&rsquo;s three Outreach-only plans run $47, $97, and $358 a month, each with
          unlimited mailboxes and warmup built in &mdash; the cost that actually scales is volume
          and uploaded contacts. Add its lead-database or CRM credits and the realistic monthly
          spend moves into $94-555/month bundles, which is where a flat-fee self-hosted alternative
          starts to compete, though a genuinely low-volume solo sender may still be better off on
          Instantly&rsquo;s cheapest plan.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          The three Outreach-only plans
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="instantly.ai/pricing, September 2026">
            Every Outreach plan includes unlimited email accounts and unlimited automated warmup at
            no extra cost
          </StatCite>{' '}
          &mdash; the plan tiers differ only in monthly email volume and how many contacts you can
          upload, not in whether warmup or mailbox count is metered:
        </p>
        <div className="card overflow-hidden overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="label text-left p-5 text-ink-muted font-semibold">Plan</th>
                <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                  Price/mo
                </th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Emails/mo
                </th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Uploaded contacts
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-5 border-t border-border align-top">Growth</td>
                <td className="p-5 border-t border-l border-border align-top">$47</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  5,000
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  1,000
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Hypergrowth</td>
                <td className="p-5 border-t border-l border-border align-top">$97</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  125,000
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  25,000
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Lightspeed</td>
                <td className="p-5 border-t border-l border-border align-top">$358</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  500,000
                </td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  100,000
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Annual billing discounts all three by roughly 20%. Lightspeed also adds Instantly&rsquo;s
          SISR system (dedicated/private server and IP blocks) on top of everything in Hypergrowth
          &mdash; the jump from $97 to $358 is a real infrastructure change, not just a volume bump.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Add a lead database or CRM, and the price shape changes
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="instantly.ai/pricing, September 2026">
            Instantly sells lead-database access as a separate credits axis
          </StatCite>{' '}
          on top of the Outreach plans above, either bundled or standalone:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <li>
            <strong>Bundle plans</strong> combine Outreach and lead-database credits in one price:
            Starter at $94/mo, Scale at $194/mo (Instantly&rsquo;s most-promoted tier, adding an AI
            reply agent and Unibox), and Agency at $555/mo.
          </li>
          <li>
            <strong>Standalone credits plans</strong> exist if you only want the 450M+ B2B lead
            database and enrichment without a separate Outreach subscription: Growth Credits at
            $47/mo for 1,500 credits, Supersonic at $197/mo, and Hyper starting at $197/mo for
            10,000+ credits.
          </li>
        </ul>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          The practical effect: a team that needs both meaningful sending volume and an ongoing lead
          source is usually pricing itself into a bundle plan, not stacking an Outreach plan and a
          Credits plan separately, since the bundles fold both into one line item at a lower
          combined rate than buying them apart.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          What a realistic team actually pays
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          A solo sender doing genuinely low volume &mdash; a few thousand emails a month, no need
          for a lead database &mdash; fits comfortably on Growth at $47/mo, and that is a fair price
          for what it includes. The number moves once a team needs more than Growth&rsquo;s 5,000
          emails/month, or wants Instantly&rsquo;s bundled lead sourcing rather than bringing its
          own list: that&rsquo;s the point where the realistic bill is $97-358/mo for Outreach
          alone, or $194-555/mo once a bundle is the better deal than stacking plans. None of
          Instantly&rsquo;s plans charge per team member directly, but a growing team&rsquo;s volume
          and contact needs tend to grow with headcount anyway, which has a similar practical effect
          on the bill.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          When a flat self-hosted option is cheaper &mdash; and when it isn&rsquo;t
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          WarmHawk&rsquo;s Tier 1 is $199/mo flat, with unlimited mailboxes, client domains, and
          users on that one fee &mdash; it doesn&rsquo;t meter by monthly email volume or uploaded
          contacts the way Instantly&rsquo;s plans do. That makes the crossover point fairly
          concrete: once your real need is closer to Instantly&rsquo;s Hypergrowth/Lightspeed tier,
          or a Scale/Agency bundle, a flat $199/mo is already cheaper and stops moving as volume or
          mailbox count grows further. See the full{' '}
          <Link href="/compare/pricing" className="text-rust font-semibold">
            WarmHawk pricing breakdown
          </Link>{' '}
          for exactly what that fee includes.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Where Instantly is still the fairer pick: a genuinely small solo sender on Growth&rsquo;s
          $47/mo, especially one who wants Instantly&rsquo;s bundled lead database and doesn&rsquo;t
          want to run any infrastructure at all. WarmHawk is a sending and warmup engine you run
          yourself (Tier 0 is free and self-hosted, Tier 1 adds the dashboard); it doesn&rsquo;t
          bundle a lead database the way Instantly&rsquo;s Starter/Scale/Agency plans do, so a team
          that leans heavily on Instantly&rsquo;s lead sourcing specifically is comparing two
          products with different scope, not just two prices.
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Plug your own numbers in rather than estimating &mdash; mailbox count, target daily
          volume, and whether you need bundled lead sourcing all change where the crossover actually
          falls for your situation.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">Run your own numbers</h2>
          <p className="text-[15px] text-ink-muted mb-4">
            See the full flat-fee breakdown, or plug in your volume and mailbox count to see where
            the crossover actually lands.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/compare/pricing" className="text-rust font-semibold">
              WarmHawk pricing &rarr;
            </Link>
            <Link href="/tools/cold-email-calculator" className="text-rust font-semibold">
              Cold email cost calculator &rarr;
            </Link>
          </div>
        </div>
      </div>

      <FaqSection items={faqItems} title="Instantly pricing: questions worth answering up front" />
    </>
  );
}
