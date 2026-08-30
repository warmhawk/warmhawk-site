// Canonical source for the values duplicated across this repo's docker/env/deploy
// config (docker/docker-compose.deploy.yml's SMTP_FROM default, .env/.env.example's
// header comment) and lib/email.ts's own fallback — those can't literally import this
// TS file (YAML/shell can't), so keep them byte-identical by hand and update this file
// first when any of them change.
export const siteConfig = {
  name: 'WarmHawk',
  url: 'https://warmhawk.com',
  description:
    'WarmHawk — enterprise cold email infrastructure running completely on your own server. Unlimited mailboxes, zero per-seat fees, real deliverability data, AI personalization with your choice of Gemini or Claude, and a queueing engine that never pushes your domains past what’s actually safe. Live in under 10 minutes, one command.',
  twitter: '@warmhawk',
  supportEmail: 'support@warmhawk.com',
  securityEmail: 'security@warmhawk.com',
  helloEmail: 'hello@warmhawk.com',
  // Matches docker/docker-compose.deploy.yml's SMTP_FROM default exactly — that file
  // can't import this constant (it's YAML), so this pairing is the one to update in
  // both places at once if it ever changes.
  defaultFrom: 'WarmHawk <support@warmhawk.com>',
};

// Order and labels match the artifact's SITE_HEADER nav exactly: Product,
// Compare, Pricing, Docs (Dashboard is a distinct external link, handled
// separately in Nav.tsx since it isn't an internal route).
export const mainNav = [
  { label: 'Product', href: '/#features' },
  { label: 'Compare', href: '/vs/smartlead' },
  { label: 'Pricing', href: '/compare/pricing' },
  { label: 'Docs', href: '/docs' },
];

// `/vs/instantly` is deliberately excluded below — its own page (app/vs/instantly/page.tsx)
// real-404s via notFound() unless ENABLE_VS_INSTANTLY is set, and that same file's header comment
// says explicitly: "Do not link this page from nav, footer, or any other page until the feature
// ships." Gating the footer entry on the identical flag (rather than hardcoding it in either
// direction) means the link appears automatically once the feature actually ships, with no
// separate "remember to add it back" step — and never appears, dead, before then.
function isFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}
const vsInstantlyLive = isFlagEnabled(process.env.ENABLE_VS_INSTANTLY);

// Which of the three repos an anonymous visitor can actually open on github.com. Exported because
// more than the footer needs it — the changelog page links each repo's CHANGELOG.md too, and a
// link to a private repo renders as GitHub's 404 page, which reads to a buyer doing diligence like
// the product doesn't exist.
//
// `warmhawk-core-engine` is the open-core half: BSL 1.1, public at go-live, so its links are
// flag-gated and light up the moment CORE_ENGINE_REPO_PUBLIC is set. The other two are
// proprietary and stay private permanently — never link them, under any flag.
export const coreEngineRepoPublic = isFlagEnabled(process.env.CORE_ENGINE_REPO_PUBLIC);
export const coreEngineRepoUrl = 'https://github.com/warmhawk/warmhawk-core-engine';

export const vsPages = [
  ...(vsInstantlyLive ? [{ slug: 'instantly', label: 'vs Instantly' }] : []),
  { slug: 'smartlead', label: 'vs Smartlead' },
  { slug: 'lemlist', label: 'vs Lemlist' },
  { slug: 'woodpecker', label: 'vs Woodpecker' },
  { slug: 'custom-n8n', label: 'vs Custom n8n' },
];

// Column labels/contents match the artifact's SITE_FOOTER (Product / Compare
// / Resources / Legal) exactly, with two real, valuable links the artifact's
// placeholder footer doesn't have (Roadmap, Support) kept in Resources
// rather than dropped — additive, not a fidelity violation.
export const footerLinks = {
  product: [
    { label: 'Core Engine (free)', href: '/docs/quickstart' },
    { label: 'Enterprise Operator', href: '/compare/pricing' },
    { label: 'Pricing', href: '/compare/pricing' },
    { label: 'Status', href: '/status' },
  ],
  compare: [
    ...(vsInstantlyLive ? [{ label: 'vs Instantly', href: '/vs/instantly' }] : []),
    { label: 'vs Smartlead', href: '/vs/smartlead' },
    { label: 'vs Lemlist', href: '/vs/lemlist' },
    { label: 'vs Woodpecker', href: '/vs/woodpecker' },
    { label: 'vs Custom n8n', href: '/vs/custom-n8n' },
  ],
  company: [
    { label: 'Docs & quickstart', href: '/docs' },
    { label: 'Domain health check', href: '/tools/domain-check' },
    { label: 'Security', href: '/security' },
    // Points at core-engine's GitHub Discussions once that repo is public — it is private today,
    // so this link 404'd for every visitor. Gated on the same kind of explicit flag as
    // ENABLE_VS_INSTANTLY above rather than hardcoded either way: the moment the repo goes public
    // at go-live, setting CORE_ENGINE_REPO_PUBLIC=true restores it with no code change, and until
    // then visitors get the FAQ/changelog page instead of a 404.
    coreEngineRepoPublic
      ? { label: 'Roadmap', href: `${coreEngineRepoUrl}/discussions` }
      : { label: 'Changelog & FAQ', href: '/docs/reference/faq-and-changelog' },
    { label: 'Support', href: 'mailto:support@warmhawk.com' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'DPA', href: '/legal/dpa' },
    { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  ],
};
