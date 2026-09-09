import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo, blogPostingSchema } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { blogPosts } from '@/lib/blogPosts';

const post = blogPosts.find((p) => p.slug === 'spf-dkim-dmarc-explained')!;

export const metadata: Metadata = pageSeo({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
});

export default function AuthenticationExplainedPost() {
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
        / Authentication
      </div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        {post.title}
      </h1>
      <AnswerBlock>
        SPF checks which servers may send for a domain. DKIM checks whether a specific message was
        altered in transit. DMARC checks whether the two agree, and tells the receiver what to do
        when they don&rsquo;t. None of the three does the other two&rsquo;s job — a domain needs
        all three to actually stop spoofing.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        SPF: which servers may send as this domain
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        SPF (Sender Policy Framework) is a TXT record listing the servers, IP ranges, and other
        domains&rsquo; records authorized to send mail claiming to be from yours. A receiver checks
        the connecting server&rsquo;s IP against that list. It says nothing about the message
        itself — a server on the list can send anything, and a forwarded message (where the
        connecting server is the forwarder, not the original sender) routinely fails SPF through no
        fault of the original sender. SPF also carries a hard ceiling worth knowing about on its
        own:{' '}
        <Link href="/blog/spf-10-dns-lookup-limit" className="text-rust font-semibold">
          exactly 10 DNS lookups
        </Link>
        , after which the entire record silently stops being honored.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        DKIM: was this specific message altered
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        DKIM (DomainKeys Identified Mail) signs each outgoing message with a private key, and
        publishes the matching public key at a DNS TXT record under a selector
        (<code className="font-mono">selector._domainkey.example.com</code>). The receiver
        recomputes the signature from the message it actually received and compares it to the one
        in the header — a mismatch means something changed the message (or the headers it signs) in
        transit. Unlike SPF, DKIM travels with the message itself and survives most forwarding, but
        it verifies integrity, not authorization: a message can be validly DKIM-signed by a
        completely different domain than the one in the visible From address.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        DMARC: do SPF and DKIM actually match the From address
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        DMARC is the piece that closes the gap above: it requires that the domain which passed SPF
        or DKIM <em>align</em> with the domain in the visible From header — not just that{' '}
        <em>some</em> domain passed one of the two checks. A message can pass SPF for a completely
        unrelated sending domain and still fail DMARC, because DMARC is asking the more specific
        question a spoofing attack actually depends on. DMARC also carries its own published
        policy, telling receivers what to do with a message that fails alignment:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-6">
        <li>
          <code className="font-mono">p=none</code> — report failures, take no other action. A
          starting point, not an end state.
        </li>
        <li>
          <code className="font-mono">p=quarantine</code> — deliver failing messages to spam/junk.
        </li>
        <li>
          <code className="font-mono">p=reject</code> — refuse failing messages outright at the
          receiving server.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        A DMARC record without a <code className="font-mono">rua</code> reporting address is
        enforcing a policy blind — it can quarantine or reject spoofed mail, but nobody at the
        domain ever sees the aggregate reports that would reveal who&rsquo;s actually being
        spoofed, or whether a legitimate sending source was accidentally caught by the policy.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        Why all three, and not just one
      </h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        SPF without DKIM breaks the moment a message is forwarded. DKIM without SPF still lets
        anyone send unauthenticated mail that simply lacks a signature — most receivers treat
        &ldquo;no DKIM signature&rdquo; far more leniently than &ldquo;DKIM signature present but
        invalid.&rdquo; And either one without DMARC has no alignment requirement at all, so a
        message can pass SPF or DKIM for some domain while still spoofing yours in the visible From
        address — which is the exact attack DMARC exists to close.
      </p>

      <div className="card bg-cream-elevated p-7 max-w-2xl">
        <h2 className="font-display text-xl font-semibold mb-3">Check all three at once</h2>
        <p className="text-[15px] text-ink-muted mb-4">
          WarmHawk&rsquo;s free checkers cover SPF, DKIM, and DMARC individually, plus MX and
          blocklist status — no account required.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/tools/spf-checker" className="text-rust font-semibold">
            SPF checker &rarr;
          </Link>
          <Link href="/tools/dkim-checker" className="text-rust font-semibold">
            DKIM checker &rarr;
          </Link>
          <Link href="/tools/dmarc-checker" className="text-rust font-semibold">
            DMARC checker &rarr;
          </Link>
          <Link href="/tools/domain-check" className="text-rust font-semibold">
            Full domain health check &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
