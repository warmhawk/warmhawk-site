export interface DocLink {
  href: string;
  title: string;
  body: string;
}

export interface DocGroupData {
  label: string;
  links: DocLink[];
}

// Single source of truth for both the /docs index cards and the sidebar nav
// on individual doc article pages, so the two never drift out of sync.
export const getStarted: DocLink[] = [
  {
    href: '/docs/introduction',
    title: 'Introduction',
    body: 'What WarmHawk is, what actually ships today, and the three tiers in one page.',
  },
  {
    href: '/docs/quickstart',
    title: 'Quickstart & installation',
    body: 'Install the stack and send a real test email in six curl calls against the real /v1 API.',
  },
];

export const guides: DocLink[] = [
  {
    href: '/docs/guides/connecting-mailboxes',
    title: 'Connecting mailboxes',
    body: 'Register a domain, then connect a mailbox via SMTP/IMAP or Google/Microsoft OAuth.',
  },
  {
    href: '/docs/guides/leads-and-enrichment',
    title: 'Leads & enrichment',
    body: 'Single create, CSV bulk import, unauthenticated webhook ingest, GDPR erasure, and the Clay/Apollo recipe.',
  },
  {
    href: '/docs/guides/campaigns-ai-and-content-quality',
    title: 'Campaigns, AI & content quality',
    body: 'Spintax vs BYOK AI personalization, the content-quality score, and the launch/pause lifecycle.',
  },
  {
    href: '/docs/guides/sending-safely-and-domain-health',
    title: 'Sending safely & domain health',
    body: 'The send queue’s cadence floor and jitter, the bounce circuit breaker, and domain health checks.',
  },
  {
    href: '/docs/guides/replies-and-team',
    title: 'Replies & team',
    body: 'IMAP reply polling and AI classification, automatic opt-out suppression, and Tier 1/2 team access.',
  },
];

export const selfHosting: DocLink[] = [
  {
    href: '/docs/self-hosting/architecture',
    title: 'Architecture',
    body: 'Every docker compose service, the internal-only network boundary, logs, and resource limits.',
  },
  {
    href: '/docs/self-hosting/backups-and-redis-durability',
    title: 'Backups & Redis durability',
    body: 'Nightly Postgres backups and the full restore procedure, plus why Redis runs AOF-durable.',
  },
  {
    href: '/docs/self-hosting/tls-and-observability',
    title: 'TLS & observability',
    body: 'Certbot issuance/renewal that fails safe, BYO-cert, bundled Uptime Kuma, and native OTEL export.',
  },
];

export const apiReference: DocLink[] = [
  {
    href: '/docs/api-reference/auth-and-mailboxes',
    title: 'Auth & mailboxes',
    body: 'POST /v1/auth/login and the full mailbox CRUD + OAuth-connect routes.',
  },
  {
    href: '/docs/api-reference/leads-and-campaigns',
    title: 'Leads & campaigns',
    body: 'Every lead-ingest route and the full campaign lifecycle, field by field.',
  },
  {
    href: '/docs/api-reference/queue-domains-and-webhooks',
    title: 'Queue, domains & webhooks',
    body: 'Queue status/pause, domain health checks — and an honest “Planned” notice for outbound webhooks.',
  },
];

export const reference: DocLink[] = [
  {
    href: '/docs/reference/guardrails-and-compliance',
    title: 'Guardrails & compliance',
    body: 'CAN-SPAM, RFC 8058, EU AI Act disclosure, GDPR erasure, the bounce circuit breaker, and rate limits.',
  },
  {
    href: '/docs/reference/faq-and-changelog',
    title: 'FAQ & changelog',
    body: 'Common orientation questions, plus what’s actually shipped in each repo so far.',
  },
];

export const opsAppendix: DocLink[] = [
  {
    href: '/docs/install-troubleshooting',
    title: 'install.sh troubleshooting',
    body: 'Docker missing, ports already bound, DNS not propagated yet, and safe re-runs.',
  },
  {
    href: '/docs/update-failures',
    title: 'warmhawk update failures',
    body: 'What warmhawk update does, a stuck migration, and rolling back a bad update.',
  },
  {
    href: '/docs/license-activation',
    title: 'License activation troubleshooting',
    body: '“License invalid”/“expired” errors, LicenseGate’s daily re-check, and paid-but-unlicensed.',
  },
  {
    href: '/docs/stripe-webhooks',
    title: 'Stripe checkout & webhooks',
    body: 'What the checkout webhook does, a missing install-command email, and the Customer Portal.',
  },
];

export const docsSections: DocGroupData[] = [
  { label: 'Get started', links: getStarted },
  { label: 'Guides', links: guides },
  { label: 'Self-hosting', links: selfHosting },
  { label: 'API reference', links: apiReference },
  { label: 'Reference', links: reference },
  { label: 'Operations appendix', links: opsAppendix },
];

// Flattened reading order, used to compute the prev/next footer nav on each
// doc article page from just the current pathname.
export const docsFlatOrder: DocLink[] = docsSections.flatMap((section) => section.links);

export interface DocPrevNext {
  prev: DocLink | null;
  next: DocLink | null;
}

/**
 * Pure prev/next lookup against `docsFlatOrder`, extracted out of
 * `app/docs/layout.tsx` so the reading-order logic (first page has no
 * prev, last page has no next, everything else gets both, an unknown
 * pathname gets neither) is unit-testable without rendering the
 * 'use client' layout component or mocking `usePathname`.
 */
export function getPrevNext(pathname: string): DocPrevNext {
  const index = docsFlatOrder.findIndex((link) => link.href === pathname);
  // `?? null` because tsconfig's `noUncheckedIndexedAccess` types array
  // indexing as `DocLink | undefined`, not `DocLink` — the index is always
  // in range when these ternaries take the truthy branch, but the type
  // checker can't know that, and `DocPrevNext` intentionally promises
  // `DocLink | null` (never `undefined`) to callers.
  const prev = index > 0 ? (docsFlatOrder[index - 1] ?? null) : null;
  const next =
    index >= 0 && index < docsFlatOrder.length - 1 ? (docsFlatOrder[index + 1] ?? null) : null;
  return { prev, next };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Home > Docs > <page title> trail for `breadcrumbSchema` (lib/seo.ts),
 * computed from `docsFlatOrder` the same way `getPrevNext` is — one source
 * of truth, no hand-added breadcrumb per article page. Deliberately stops
 * at two levels deep rather than also naming the doc's section (Guides,
 * API reference, etc.): those groupings have no page of their own, and
 * Google's breadcrumb guidelines expect every non-final crumb to resolve to
 * a real URL. Returns an empty trail for a pathname outside the docs
 * reading order (e.g. the `/docs` index itself, which renders no article
 * layout to attach a trail to).
 */
export function getBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  const link = docsFlatOrder.find((l) => l.href === pathname);
  if (!link) return [];
  return [
    { name: 'Home', path: '/' },
    { name: 'Docs', path: '/docs' },
    { name: link.title, path: link.href },
  ];
}
