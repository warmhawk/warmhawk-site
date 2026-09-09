import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { blogPosts } from '@/lib/blogPosts';

export const metadata: Metadata = pageSeo({
  title: 'Blog',
  description:
    'Deliverability and email-authentication explainers from WarmHawk: SPF, DKIM, DMARC, blocklists, and the mechanics behind sending mail that actually lands in the inbox.',
  path: '/blog',
});

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function BlogIndexPage() {
  return (
    <div className="wrap py-16">
      <div className="label text-rust mb-5">Blog</div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Deliverability, explained plainly.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        The mechanics behind SPF, DKIM, DMARC, and the rest of what decides whether a message
        lands in the inbox or the junk folder — written for the person who has to actually fix it,
        not just be told it&rsquo;s broken.
      </p>
      <AnswerBlock>
        This is WarmHawk&rsquo;s blog: short, specific explainers on email authentication and
        deliverability, each one grounded in a real mechanism (an RFC limit, a DNS lookup budget,
        an alignment rule) rather than generic advice. Start with whichever post matches what
        you&rsquo;re currently stuck on.
      </AnswerBlock>

      <div className="mt-14 grid gap-5 max-w-2xl">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="card bg-cream p-6 block hover:border-rust transition-colors"
          >
            <div className="text-[11px] font-mono text-ink-muted mb-2">
              {formatDate(post.date)}
            </div>
            <div className="font-display text-xl font-semibold mb-2">{post.title}</div>
            <div className="text-sm leading-relaxed text-ink-muted">{post.excerpt}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
