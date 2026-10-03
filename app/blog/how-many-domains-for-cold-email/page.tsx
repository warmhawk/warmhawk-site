import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'how-many-domains-for-cold-email')!;

export const metadata: Metadata = pageSeo({
  title: post.metaTitle ?? post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question: 'Why not just put more inboxes on one domain instead of buying more domains?',
    answer:
      "Because domain-level reputation is shared across every inbox sending from it — if one of ten inboxes on a domain gets flagged, the damage isn't contained to that one address. Spreading inboxes across more domains, at a lower count per domain, limits how much of your total sending capacity any single reputation problem can take down at once.",
  },
  {
    question: 'How many cold emails per day is actually safe per inbox?',
    answer:
      'Most practitioner guidance converges on roughly 30-50 cold emails per inbox per day as a sustainable ceiling. Pushing meaningfully past that on a single inbox is what tends to trigger the volume-pattern flags receivers watch for, independent of how good the list or copy is.',
  },
  {
    question: 'Should I buy and set up new domains before or after I need the extra volume?',
    answer:
      'Before — with real lead time. A new domain and its inboxes need the same 2-4 week warmup ramp as any other new sending address before they can carry full cold volume, so domain provisioning has to happen roughly a month ahead of the day you actually need the capacity, not the week before.',
  },
  {
    question: "Can I reuse my company's main domain for a second batch of cold-outreach inboxes?",
    answer:
      "It's the one thing to avoid regardless of how much spare capacity the primary domain seems to have. Cold outreach carries meaningfully higher bounce and spam-complaint risk than transactional or relationship email, and a reputation hit on the primary domain can affect deliverability for invoices, password resets, and every other message that domain sends — not just the cold campaign that caused it.",
  },
];

export default function HowManyDomainsForColdEmailPost() {
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
          / Infrastructure
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          Domain count is a function of one number: your target daily send volume, divided by
          roughly 30-50 safe cold emails per inbox per day, divided again by the 2-3 inboxes a
          domain can reasonably carry. A team sending 1,000 cold emails a day needs on the order of
          25 inboxes and 9 domains &mdash; and every one of those domains still needs its own 2-4
          week warmup ramp before it can carry that load.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">The per-inbox daily cap</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Most practitioner guidance and the throttling behavior major receivers themselves apply
          converge on roughly 30-50 cold emails per inbox per day as a sustainable ceiling for a
          fully warmed-up mailbox. That is not a hard platform limit &mdash; Gmail and Microsoft 365
          both technically allow sending far more before a rate limiter intervenes &mdash; it is a
          reputation ceiling: past that range, on cold (not opted-in) recipients, engagement rates
          drop and bounce/complaint rates climb enough to put a mailbox&rsquo;s standing at risk,
          independent of copy quality or list hygiene. Treat it as the number to plan capacity
          around, not the number to push toward.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Why 2-3 inboxes per domain, not more
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          A domain&rsquo;s reputation is shared across every inbox sending from it &mdash; SPF,
          DKIM, and DMARC all evaluate at the domain level, and receivers factor domain-wide signals
          (volume, bounce rate, complaint rate, blocklist status) into how they treat every mailbox
          on it. Concentrating ten aggressively-sending inboxes on one domain means a reputation
          problem on any single one of them puts the other nine at risk too. Two to three inboxes
          per domain is the practical ceiling most senders settle on: enough to get real throughput
          per domain provisioned, without concentrating so much sending behavior on one domain that
          a single inbox&rsquo;s mistake becomes a domain-wide problem.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Volume to domain count, worked out
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          At 40 emails/inbox/day (the middle of the 30-50 range) and 3 inboxes/domain, here&rsquo;s
          what different target volumes actually require:
        </p>
        <div className="card overflow-hidden overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="label text-left p-5 text-ink-muted font-semibold">
                  Target daily volume
                </th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Inboxes needed
                </th>
                <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                  Domains needed
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-5 border-t border-border align-top">100/day</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">3</td>
                <td className="p-5 border-t border-l border-border align-top">1</td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">500/day</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">13</td>
                <td className="p-5 border-t border-l border-border align-top">5</td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">1,000/day</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">25</td>
                <td className="p-5 border-t border-l border-border align-top">9</td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">5,000/day</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  125
                </td>
                <td className="p-5 border-t border-l border-border align-top">42</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Adjust the per-inbox and per-domain figures to your own risk tolerance and these numbers
          move accordingly &mdash; the formula matters more than the specific table: inboxes =
          target volume &divide; per-inbox cap; domains = inboxes &divide; inboxes-per-domain, both
          rounded up.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Secondary-domain naming</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Never send cold outreach from your primary corporate domain &mdash; the one your invoices,
          password resets, and customer-facing email already depend on. A bounce or complaint spike
          from a cold campaign can degrade deliverability for all of that other mail too, and
          it&rsquo;s not worth the risk when secondary domains are cheap and fast to provision. The
          common convention is a clear, brand-adjacent variant of your real domain &mdash;{' '}
          <code className="font-mono">trycompany.com</code>,{' '}
          <code className="font-mono">getcompany.com</code>,{' '}
          <code className="font-mono">meetcompany.com</code>, or{' '}
          <code className="font-mono">hicompany.com</code> &mdash; registered specifically for
          outreach, with no MX record pointed at anything customer-facing. If one of them ever needs
          to be burned and replaced, nothing about the primary domain or brand is affected.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          The warmup lead time nobody budgets for
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          The domain-count math above answers &ldquo;how many,&rdquo; but not &ldquo;how soon they
          can carry the load.&rdquo; Every new domain and inbox needs the same{' '}
          <Link href="/blog/what-is-email-warmup" className="text-rust font-semibold">
            2-4 week warmup ramp
          </Link>{' '}
          before it&rsquo;s safe to run at full per-inbox volume &mdash; buying nine domains the
          week before a campaign launch means none of them are actually ready to send at capacity on
          day one. Provision new domains with that lead time built in: if a volume increase is
          coming next quarter, the domains and warmup schedule need to start now, not once the
          volume is already needed.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">
            Get an exact number for your target volume
          </h2>
          <p className="text-[15px] text-ink-muted mb-4">
            Plug in your target daily send volume and per-inbox/per-domain assumptions to get the
            exact inbox and domain count you need.
          </p>
          <Link href="/tools/cold-email-calculator" className="text-rust font-semibold">
            Cold email domain calculator &rarr;
          </Link>
        </div>
      </div>

      <FaqSection
        items={faqItems}
        title="Domains for cold email: questions worth answering up front"
      />
    </>
  );
}
