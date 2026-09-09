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
