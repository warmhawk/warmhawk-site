# Changelog

All notable changes to `warmhawk-site` are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed — Stripe webhook double-issued licenses on every purchase

- `checkout.session.completed` and `invoice.paid` were both handled identically for a
  `mode: 'subscription'` Checkout — Stripe fires both for the same initial purchase, so every real
  sale issued two license keys and sent two emails. Now issues from `invoice.paid` alone (Stripe's
  documented pattern for provisioning subscription access), which already covers the first invoice
  and every renewal, so nothing is lost by dropping the other. Also fixed a second, previously
  inert bug this surfaced: a Checkout Session's own `metadata` does not propagate to the invoices
  Stripe generates for the resulting subscription, so `invoice.metadata.billingInterval` would
  have silently resolved to the `'monthly'` fallback for every annual subscriber once the switch
  was made — fixed by moving that metadata onto `subscription_data` in
  `app/api/checkout/session/route.ts`, which Stripe does copy onto every invoice. Also fixed
  license-email delivery being silently broken on the `invoice.paid` path: `Stripe.Invoice`
  carries the customer's email as `customer_email`, not `customer_details.email` (a
  `Checkout.Session`-only field the old code read unconditionally).
- Rotated the test RSA keypair committed in `.env.example` (and its copies in `lib/license.test.ts`
  and warmhawk-enterprise-operator's `.env.example`/test file) — not because of any known
  compromise, but because the prior one had been pasted into a chat transcript during an audit.
  Added `.gitleaks.toml` allowlisting this specific, documented test value by path, so CI's
  gitleaks scan (already wired into `ci.yml`) doesn't flag it once this repo is a public git repo.

### Added

- Initial site scaffold: Next.js App Router, TypeScript, Tailwind CSS on
  the "Warm Signal" (cream/rust) palette from the finalized homepage
  design artifact.
- Homepage (nav, hero, stat strip, features, comparison callout, FAQ,
  three-tier pricing, closing CTA, footer).
- `/vs/instantly`, `/vs/smartlead`, `/vs/lemlist`, `/vs/woodpecker`,
  `/vs/custom-n8n` comparison pages and `/compare/pricing`.
- `/tools/domain-check` free public SPF/DKIM/DMARC/blocklist/RFC 8058
  checker.
- `/docs` section: Tier 0 quickstart and troubleshooting guides (install,
  TLS/certbot, license activation, Stripe/webhooks, docker compose,
  backup/restore, `warmhawk update`, Clay/Apollo enrichment recipe).
- `/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/dpa`
  — draft text, all marked pending attorney review.
- `/.well-known/security.txt` (RFC 9116) and `/security` disclosure page.
- `/status` page.
- Stripe Checkout session, webhook, and Customer Portal API route
  skeletons (Tier 1 monthly + annual pricing).
- `sitemap.xml` / `robots.txt` generation, Open Graph/Twitter Card/
  canonical metadata, `FAQPage` schema site-wide.
- CI (`ci.yml`) and deploy (`deploy.yml`) self-contained GitHub Actions workflows.
