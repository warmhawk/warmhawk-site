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
  // next build's own internal ESLint pass (separate from this repo's own
  // `npm run lint` / CI's 1.8-lint-format step, both still eslint 8.57.1's
  // real `eslint .` CLI and both still passing) broke against next 15.5.24's
  // lint runner: "ESLint: Invalid Options: - Unknown options: useEslintrc,
  // extensions" (confirmed live 2026-08-29, build still exits 0, but the
  // internal pass silently does nothing). Next 16 removes build-time
  // linting entirely in favor of exactly the standalone-CLI pattern this
  // repo already uses, so skip the broken redundant internal pass now
  // rather than carry a build log that misleadingly shows a lint failure.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // OpenTelemetry's auto-instrumentation patches Node's own require() at runtime to wrap http/dns/
  // etc. — webpack bundling that code (the default for anything imported under app/ or, via
  // instrumentation.ts, the server runtime) breaks that patching. This is Next's own documented
  // fix: listing the packages here makes Next require() them natively via Node instead of bundling
  // them. Only takes effect when instrumentation.ts's register() actually loads them (see that
  // file) — OTEL_EXPORTER_OTLP_ENDPOINT unset, the default, skips it entirely.
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
  ],
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
