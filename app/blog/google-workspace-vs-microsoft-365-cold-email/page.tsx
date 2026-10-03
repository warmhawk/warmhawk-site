import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { StatCite } from '@/components/StatCite';
import { FaqSection } from '@/components/FaqSchema';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'google-workspace-vs-microsoft-365-cold-email')!;

export const metadata: Metadata = pageSeo({
  title: post.metaTitle ?? post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

const faqItems = [
  {
    question: 'Is Google Workspace or Microsoft 365 better for cold email in 2026?',
    answer:
      'Neither has a decisive edge on price anymore — entry-level plans on both sit at $7/user/month on an annual commitment as of September 2026. The practical difference is risk profile: a brand-new Microsoft 365 tenant can hit the 5.7.708 outbound block with no self-service fix, while Google Workspace already requires OAuth for SMTP with no equivalent hard new-tenant block today.',
  },
  {
    question: 'Why did my new Microsoft 365 tenant get a 5.7.708 error?',
    answer:
      'Microsoft assigns new and trial tenants a low-reputation outbound IP pool by default as an anti-spam measure, and 550 5.7.708 "Access denied, traffic not accepted from this IP" is what that block looks like from the sending side. There is no tenant-side setting that clears it — a tenant admin has to open a Microsoft support ticket and request an IP-reputation exception.',
  },
  {
    question: 'Does Gmail require OAuth for sending SMTP now?',
    answer:
      'Yes — Google Workspace disabled basic username/password authentication for SMTP, IMAP, and POP as of May 2025. OAuth 2.0 (or an app password where 2-Step Verification is enabled) is required today; there is no path back to plain username/password SMTP auth for a Workspace account.',
  },
  {
    question: 'Is Microsoft also getting rid of SMTP AUTH with a password?',
    answer:
      "Eventually, but on a much slower and repeatedly delayed timeline than Google's. As of the latest published schedule, behavior is unchanged through December 2026, then SMTP AUTH basic auth gets disabled by default for existing tenants (admins can still re-enable it), and tenants created after December 2026 won't have it available at all — full removal is expected to be announced sometime in the second half of 2027.",
  },
];

export default function GoogleWorkspaceVsMicrosoft365Post() {
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
          / Email infrastructure
        </div>
        <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
          {post.title}
        </h1>
        <AnswerBlock>
          Google Workspace and Microsoft 365 landed on nearly identical entry-level pricing in 2026
          after Microsoft&rsquo;s July price increase &mdash; $7/user/month on an annual plan for
          either platform&rsquo;s cheapest tier. The real difference for cold email is a
          Microsoft-specific new-tenant outbound block (error 5.7.708) with no self-service fix, and
          the two vendors sitting on very different timelines for retiring password-based SMTP auth.
        </AnswerBlock>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Per-mailbox price, side by side
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="workspace.google.com/pricing and microsoft.com/microsoft-365/business, September 2026">
            Both platforms&rsquo; entry-level, annual-commitment pricing now sits at $7/user/month
          </StatCite>{' '}
          &mdash; a genuine change from the historical gap between them, driven by Microsoft raising
          Business Basic from $6 to $7/user/month effective July 1, 2026:
        </p>
        <div className="card overflow-hidden overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="label text-left p-5 text-ink-muted font-semibold">Tier</th>
                <th className="label text-left p-5 text-ink-muted font-semibold border-l border-border">
                  Google Workspace
                </th>
                <th className="label text-left p-5 text-rust font-semibold border-l border-border">
                  Microsoft 365 Business
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-5 border-t border-border align-top">Entry-level, per user/mo</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Business Starter — $7 (annual commitment)
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Business Basic — $7 (annual commitment)
                </td>
              </tr>
              <tr>
                <td className="p-5 border-t border-border align-top">Mid-tier, per user/mo</td>
                <td className="p-5 border-t border-l border-border align-top text-ink-muted">
                  Business Standard — $14 (annual commitment)
                </td>
                <td className="p-5 border-t border-l border-border align-top">
                  Business Standard — $14 (annual commitment)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Both vendors also sell month-to-month (no annual commitment) pricing at a markup over
          these figures, and both run promotional discounts for a limited number of seats/months at
          various points &mdash; check each vendor&rsquo;s own pricing page for the current promo,
          since those change more often than the underlying list price.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Sending limits</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="Google Workspace admin documentation, September 2026">
            Google Workspace caps external recipients at 2,000 per rolling 24-hour period per user
          </StatCite>
          , with a separate 3,000/day cap on total unique recipients and a 500-external-recipient
          limit per individual message.{' '}
          <StatCite source="Microsoft Exchange Online service description, September 2026">
            Microsoft 365&rsquo;s Exchange Online recipient rate limit is 10,000 recipients per
            mailbox per rolling 24-hour period
          </StatCite>{' '}
          (internal and external combined) &mdash; a separate, lower external-only limit was planned
          for April 2026 but was canceled indefinitely in January 2026 after customer pushback, so
          as of September 2026 the 10,000 combined figure is the operative ceiling. Both figures are
          rate limits enforced by the platform, not deliverability targets &mdash; sending anywhere
          near either ceiling on a cold-outbound domain will damage reputation long before the
          platform itself intervenes.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          OAuth vs SMTP AUTH: very different timelines
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          <StatCite source="Google Workspace admin documentation, September 2026">
            Google Workspace already disabled basic username/password authentication for SMTP, IMAP,
            and POP as of May 2025
          </StatCite>{' '}
          &mdash; OAuth 2.0 (or an app password, itself being phased toward OAuth) is required
          today, with no path back to a plain password for third-party SMTP senders. Microsoft has
          moved in the opposite direction: it originally planned to retire SMTP AUTH basic auth in
          2025, pushed that to a phased rollout in early-to-mid 2026, and then{' '}
          <StatCite source="Microsoft Exchange Team blog, updated timeline, September 2026">
            delayed the retirement again &mdash; behavior is unchanged through December 2026, then
            disabled by default for existing tenants at the end of that month, with tenants created
            after December 2026 unable to use it at all
          </StatCite>{' '}
          and a final removal date not expected to be announced until the second half of 2027. In
          practice: if a cold-email tool or script connects via raw SMTP with a password today, that
          path is already closed on Google Workspace and still open, for now, on most existing
          Microsoft 365 tenants.
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          The 5.7.708 &ldquo;tenant not trusted&rdquo; block
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
          <StatCite source="Microsoft 365 admin community reports, September 2026">
            A new or trial Microsoft 365 tenant is commonly assigned a low-reputation outbound IP
            pool by default
          </StatCite>{' '}
          as an anti-abuse measure, and the symptom is a bounce reading{' '}
          <code className="font-mono">
            550 5.7.708 Access denied, traffic not accepted from this IP
          </code>
          . It hits legitimate new tenants, not just spam accounts &mdash; the block is based on the
          tenant&rsquo;s newness and the shared IP pool it landed on, not on anything the sender did
          wrong. There is no documented tenant-side fix: a tenant admin has to confirm the mailbox
          has a fully provisioned Exchange Online license, then open a Microsoft support ticket
          specifically requesting an IP-reputation exception. Google Workspace has no directly
          equivalent hard block for new domains, though a brand-new domain on either platform is
          still subject to the same new-domain caution every major receiver applies &mdash; see{' '}
          <Link href="/blog/what-is-email-warmup" className="text-rust font-semibold">
            why that makes warmup non-optional regardless of platform
          </Link>
          .
        </p>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          If you&rsquo;re seeing this error on a new tenant, a full walkthrough of the fix path
          lives at{' '}
          <Link href="/errors/5-7-708" className="text-rust font-semibold">
            /errors/5-7-708
          </Link>
          .
        </p>

        <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
          Deliverability reputation in 2026
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
          Both platforms are large, well-regarded senders in their own right, and neither name alone
          determines whether your mail lands in the inbox &mdash; that comes down to your specific
          domain&rsquo;s authentication (SPF, DKIM, DMARC), sending history, and list quality on top
          of whichever platform you&rsquo;re on. The platform-specific risk worth planning around is
          asymmetric, though: a new Microsoft 365 tenant carries a real chance of hitting the
          5.7.708 block described above, with a support-ticket-only fix and no predictable timeline,
          while a new Google Workspace domain has no equivalent hard block but still needs the same
          reputation-building ramp any new domain does on any provider.
        </p>

        <div className="card bg-cream-elevated p-7 max-w-2xl">
          <h2 className="font-display text-xl font-semibold mb-3">
            Check a domain before you commit to either platform
          </h2>
          <p className="text-[15px] text-ink-muted mb-4">
            SPF, DKIM, DMARC, MX, and blocklist status for any domain — free, no account required.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/tools/domain-check" className="text-rust font-semibold">
              Full domain health check &rarr;
            </Link>
            <Link href="/errors/5-7-708" className="text-rust font-semibold">
              Fix a 5.7.708 block &rarr;
            </Link>
          </div>
        </div>
      </div>

      <FaqSection
        items={faqItems}
        title="Google Workspace vs Microsoft 365: questions worth answering up front"
      />
    </>
  );
}
