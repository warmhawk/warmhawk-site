export const siteConfig = {
  name: 'WarmHawk',
  url: 'https://warmhawk.com',
  description:
    'WarmHawk — enterprise cold email infrastructure running completely on your own server. Unlimited mailboxes, zero per-seat fees, real deliverability data, AI personalization with your choice of Gemini or Claude, and a queueing engine that never pushes your domains past what’s actually safe. Live in under 10 minutes, one command.',
  twitter: '@warmhawk',
  supportEmail: 'support@warmhawk.com',
  securityEmail: 'security@warmhawk.com',
  helloEmail: 'hello@warmhawk.com',
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
    { label: 'Roadmap', href: 'https://github.com/warmhawk/warmhawk-core-engine/discussions' },
    { label: 'Support', href: 'mailto:support@warmhawk.com' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'DPA', href: '/legal/dpa' },
    { label: 'Acceptable Use', href: '/legal/acceptable-use' },
  ],
};
