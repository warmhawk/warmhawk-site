/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static-export-leaning: every marketing/docs/legal/comparison page is a
  // plain server-rendered React Server Component with no per-request data
  // dependency, so Next statically prerenders it at build time by default.
  // We stop short of `output: "export"` only because two routes need a
  // real Node runtime: the Stripe Checkout session/webhook/portal API
  // routes (Phase 4 — Commercial Licensing & Billing) and the
  // `/tools/domain-check` page's client-side call to core-engine's public
  // API. Everything else ships as static HTML.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Security headers baseline (Phase 1 production hardening table),
        // built fresh here since outreach-infra never had a `next.config.js`
        // hardening pass to port from.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
