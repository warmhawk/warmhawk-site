export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  /** ISO 8601 date, e.g. "2026-09-09". Used for both display and BlogPosting JSON-LD. */
  date: string;
}

// Single source of truth for the /blog index cards, sitemap.xml, and each post's own JSON-LD date
// — mirrors lib/docsNav.ts's role for /docs, so the post list can't drift out of sync across those
// three places. Newest first; the index and sitemap both render in this order.
export const blogPosts: BlogPost[] = [
  {
    slug: 'what-is-email-warmup',
    title: 'Email Warmup: The Complete Guide (2026)',
    description:
      'What email warmup actually does to sender reputation, why it takes 2-4 weeks and cannot be rushed, the difference between manual warmup, automated warmup, and shared warmup-pool networks, and where placement sampling fits once warmup is done.',
    excerpt:
      'Warmup is a sender-reputation mechanism, not a checkbox — a mailbox that skips it gets treated as suspicious by every receiver on day one, no matter how good the copy is.',
    date: '2026-09-15',
  },
  {
    slug: 'dedicated-ip-vs-shared-warmup-pool',
    title: 'Dedicated IP vs Shared Warmup Pool: The Reputation Risk Nobody Explains',
    description:
      "Most cold-email warmup runs through a shared pool of accounts across every customer of that vendor. Here's the actual mechanism by which one bad sender in that pool degrades placement for every other domain warming through it, and why a dedicated, per-customer setup doesn't have that failure mode.",
    excerpt:
      "A shared warmup pool means your domain's reputation is partly a function of strangers you've never met and can't audit — one of them gets flagged, and the whole pool's placement can suffer.",
    date: '2026-09-15',
  },
  {
    slug: 'spf-10-dns-lookup-limit',
    title: "SPF's 10-lookup limit: why a valid-looking record can still silently fail",
    description:
      'RFC 7208 caps SPF at exactly 10 DNS lookups. Go over, and receivers are required to treat the whole record as a permanent error — with no warning anywhere in your own DNS. Here is what actually counts against the budget, why it creeps up without anyone editing the record by hand, and how to bring it back under the limit.',
    excerpt:
      'A record that resolves fine and lists the right senders can still fail every recipient check, because the failure happens during evaluation, not lookup — and nothing in your own DNS ever shows you the count.',
    date: '2026-09-08',
  },
  {
    slug: 'spf-dkim-dmarc-explained',
    title: 'SPF, DKIM, and DMARC: what each one actually checks',
    description:
      'Three different mechanisms, three different questions, and none of them alone stops spoofing. A plain-English breakdown of what SPF, DKIM, and DMARC each verify, how DMARC alignment ties the first two together, and why a domain needs all three to actually be protected.',
    excerpt:
      'SPF checks the sending server. DKIM checks the message itself. DMARC checks whether the two agree — and only DMARC can tell a receiver what to do when they don’t.',
    date: '2026-09-05',
  },
];
