export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** Shorter <title> when `title` (also the H1) would overflow the search-result title limit. */
  metaTitle?: string;
  excerpt: string;
  /** ISO 8601 date, e.g. "2026-09-09". Used for both display and BlogPosting JSON-LD. */
  date: string;
}

// Single source of truth for the /blog index cards, sitemap.xml, and each post's own JSON-LD date
// — mirrors lib/docsNav.ts's role for /docs, so the post list can't drift out of sync across those
// three places. Newest first; the index and sitemap both render in this order.
export const blogPosts: BlogPost[] = [
  {
    slug: 'dmarc-none-vs-quarantine-vs-reject',
    title: 'DMARC p=none vs quarantine vs reject: which policy should you actually run?',
    description:
      'What each DMARC policy tells receivers to do with failing mail, what pct= and rua/ruf are for, a safe none-to-reject rollout, and the Google/Yahoo bulk-sender floor.',
    metaTitle: 'DMARC p=none vs quarantine vs reject: which to run?',
    excerpt:
      'p=none only watches. p=quarantine routes failures to spam. p=reject blocks them outright — and jumping straight there without reading your own rua reports first is how legitimate mail gets silently dropped.',
    date: '2026-09-29',
  },
  {
    slug: 'how-many-domains-for-cold-email',
    title: 'How many domains do you need for cold email? The actual math',
    description:
      'The per-inbox daily send cap, why 2-3 inboxes per domain is the practical ceiling, a volume-to-domain table, naming conventions, and warmup lead time.',
    metaTitle: 'How many domains do you need for cold email?',
    excerpt:
      'Domain count is a function of one number: how many cold emails you want to send per day, divided by what a single inbox can safely carry before it starts burning reputation.',
    date: '2026-09-29',
  },
  {
    slug: 'google-workspace-vs-microsoft-365-cold-email',
    title: 'Google Workspace vs Microsoft 365 for cold email (2026)',
    metaTitle: 'Google Workspace vs Microsoft 365 for Cold Email',
    description:
      'Per-mailbox pricing, daily sending limits, OAuth vs SMTP AUTH timelines, and the Microsoft 5.7.708 new-tenant block, checked against vendor docs in September 2026.',
    excerpt:
      'The two platforms converged on nearly identical per-mailbox pricing in 2026 — the real difference for cold email is a Microsoft-specific new-tenant block that has no self-service fix.',
    date: '2026-09-29',
  },
  {
    slug: 'instantly-pricing',
    title: 'Instantly pricing in 2026: what you actually pay, plan by plan',
    description:
      "A breakdown of Instantly's outreach and lead-database plans, what solo senders and agencies pay once add-ons stack, and when a flat-fee self-hosted tool is cheaper.",
    metaTitle: 'Instantly pricing in 2026: what you actually pay',
    excerpt:
      "Instantly's cheapest plan is $47/month with unlimited mailboxes and warmup built in — the number that actually varies is how fast a growing team's leads and volume push it into a $194-555/month bundle.",
    date: '2026-09-29',
  },
  {
    slug: 'self-hosted-email-warmup',
    title: 'Self-hosted email warmup: how it actually works',
    description:
      'How self-run warmup works: your own mailboxes plus a real-send ramp, why shared pools are fragile, what to measure (7-day inbox rate, 90%+), and a ramp schedule.',
    excerpt:
      "Self-hosted warmup trades a vendor's shared network of strangers' mailboxes for infrastructure you control end to end — the ramp still takes weeks, but the reputation risk you're exposed to is only ever your own.",
    date: '2026-09-29',
  },
  {
    slug: 'what-is-email-warmup',
    title: 'Email Warmup: The Complete Guide (2026)',
    description:
      'What email warmup does to sender reputation, why it takes 2-4 weeks, manual vs automated vs shared-pool warmup, and where placement sampling fits afterward.',
    excerpt:
      'Warmup is a sender-reputation mechanism, not a checkbox — a mailbox that skips it gets treated as suspicious by every receiver on day one, no matter how good the copy is.',
    date: '2026-09-15',
  },
  {
    slug: 'dedicated-ip-vs-shared-warmup-pool',
    title: 'Dedicated IP vs Shared Warmup Pool: The Reputation Risk Nobody Explains',
    description:
      'How one bad sender in a shared warmup pool degrades placement for every other domain in it, and why a dedicated, per-customer setup avoids that failure mode.',
    metaTitle: 'Dedicated IP vs Shared Warmup Pool: Reputation Risk',
    excerpt:
      "A shared warmup pool means your domain's reputation is partly a function of strangers you've never met and can't audit — one of them gets flagged, and the whole pool's placement can suffer.",
    date: '2026-09-15',
  },
  {
    slug: 'spf-10-dns-lookup-limit',
    title: "SPF's 10-lookup limit: why a valid-looking record can still silently fail",
    description:
      'RFC 7208 caps SPF at 10 DNS lookups; go over and the whole record is a permanent error. What counts toward the limit, why it creeps up, and how to get back under.',
    metaTitle: "SPF's 10-lookup limit: why valid records still fail",
    excerpt:
      'A record that resolves fine and lists the right senders can still fail every recipient check, because the failure happens during evaluation, not lookup — and nothing in your own DNS ever shows you the count.',
    date: '2026-09-08',
  },
  {
    slug: 'spf-dkim-dmarc-explained',
    title: 'SPF, DKIM, and DMARC: what each one actually checks',
    description:
      'What SPF, DKIM and DMARC each verify, how DMARC alignment ties the first two together, and why a domain needs all three to be protected against spoofing.',
    excerpt:
      'SPF checks the sending server. DKIM checks the message itself. DMARC checks whether the two agree — and only DMARC can tell a receiver what to do when they don’t.',
    date: '2026-09-05',
  },
];
