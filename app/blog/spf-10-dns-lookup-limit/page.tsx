import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'spf-10-dns-lookup-limit')!;

export const metadata: Metadata = pageSeo({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

export default function SpfLookupLimitPost() {
  return (
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
        / SPF
      </div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        {post.title}
      </h1>
      <AnswerBlock>
        RFC 7208 caps SPF evaluation at exactly 10 DNS lookups. Go over, and a receiver is required
        to treat the whole record as a <code className="font-mono">permerror</code> — not &ldquo;fail
        the check,&rdquo; but stop evaluating it entirely, with nothing in your own DNS ever showing
        you the count.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        The record can look completely fine and still be broken
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        A DNS lookup for a TXT record either resolves or it doesn&rsquo;t — there&rsquo;s no such
        thing as a query that fails because there were &ldquo;too many other queries.&rdquo; That&rsquo;s
        exactly why this failure mode is so easy to miss: the record itself resolves fine, lists
        the right senders, and passes a casual read. The failure happens one layer up, during{' '}
        <em>evaluation</em> — the receiver walks the record, follows every mechanism that requires
        its own DNS lookup, and once that walk passes 10, RFC 7208 requires it to stop and return{' '}
        <code className="font-mono">permerror</code> for the whole record, not just the mechanisms
        past the limit.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        What actually counts against the budget
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Five mechanism types cost a lookup each time they appear: <code className="font-mono">include</code>,{' '}
        <code className="font-mono">a</code>, <code className="font-mono">mx</code>,{' '}
        <code className="font-mono">ptr</code>, and <code className="font-mono">exists</code>. A{' '}
        <code className="font-mono">redirect</code> also costs one, and then hands off evaluation to
        the record it points at — so its cost doesn&rsquo;t stop there. <code className="font-mono">mx</code>{' '}
        is the sneakiest of the five: it doesn&rsquo;t just cost one lookup for itself, it costs one
        lookup <em>per MX record</em> the domain has, since each one has to be resolved to an IP.
        A domain with 4 mail exchangers spends 4 of its 10 lookups on a single{' '}
        <code className="font-mono">mx</code> mechanism.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        <code className="font-mono">ip4</code>, <code className="font-mono">ip6</code>, and the{' '}
        <code className="font-mono">all</code> qualifier at the end are free — they&rsquo;re literal
        values, not lookups.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        Why it creeps up without anyone editing the record
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        The usual path to 11 lookups isn&rsquo;t someone hand-editing a TXT record until it breaks
        — it&rsquo;s <code className="font-mono">include</code> chains. Most cold-email and
        marketing platforms publish their own SPF record as an{' '}
        <code className="font-mono">include:</code> target, and that record often includes another
        provider&rsquo;s record in turn. Add a second ESP, a helpdesk tool, and a CRM that each ask
        to be included, and the budget is gone before you&rsquo;ve written a single mechanism
        yourself — nobody touched the record&rsquo;s visible content, the total lookup count just
        grew underneath it.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Bringing it back under 10</h2>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          Drop any <code className="font-mono">include</code> for a service you no longer send
          through — these accumulate silently over a domain&rsquo;s lifetime.
        </li>
        <li>
          Replace <code className="font-mono">mx</code> or <code className="font-mono">a</code>{' '}
          mechanisms with the literal <code className="font-mono">ip4</code>/<code className="font-mono">ip6</code>{' '}
          ranges they resolve to, if those ranges are stable — this trades a per-request DNS lookup
          for a free literal.
        </li>
        <li>
          Remove <code className="font-mono">ptr</code> entirely if present — it&rsquo;s deprecated
          by RFC 7208 itself specifically because of how expensive and unreliable it is, and almost
          nothing needs it.
        </li>
        <li>
          For a genuinely large set of includes, a dedicated SPF-flattening service can pre-resolve
          the chain into static <code className="font-mono">ip4</code> ranges — worth it only once
          simple removal isn&rsquo;t enough.
        </li>
      </ul>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <h2 className="font-display text-xl font-semibold mb-3">Check your own lookup count</h2>
        <p className="text-[15px] text-ink-muted mb-4">
          WarmHawk&rsquo;s free SPF checker shows your live record and its exact lookup count
          against the 10-lookup ceiling, alongside MX, DKIM, DMARC, and blocklist status — no
          account required.
        </p>
        <Link href="/tools/spf-checker" className="text-rust font-semibold">
          Check your SPF record &rarr;
        </Link>
      </div>
    </div>
  );
}
