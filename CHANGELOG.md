# Changelog

All notable changes to `warmhawk-site` are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-09-02 — Initial public release

### Added

- Homepage (nav, hero, stat strip, features, comparison callout, FAQ,
  three-tier pricing, closing CTA, footer) on the "Warm Signal" (cream/rust)
  palette.
- `/vs/instantly`, `/vs/smartlead`, `/vs/lemlist`, `/vs/woodpecker`,
  `/vs/custom-n8n` comparison pages and `/compare/pricing`.
- `/tools/domain-check` — free public SPF/DKIM/DMARC/blocklist/RFC 8058
  checker.
- `/docs` section: Tier 0 quickstart and troubleshooting guides (install,
  TLS/certbot, license activation, Stripe/webhooks, docker compose,
  backup/restore, `warmhawk update`, Clay/Apollo enrichment recipe).
- `/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/dpa`
  — draft text, pending attorney review.
- `/.well-known/security.txt` (RFC 9116) and `/security` disclosure page.
- `/status` page.
- Stripe Checkout (Tier 1 monthly/annual pricing), webhook-driven license
  issuance via `invoice.paid` (covers both the first invoice and every
  renewal without double-issuing), and Customer Portal integration.
- `sitemap.xml` / `robots.txt` generation, Open Graph/Twitter Card/
  canonical metadata, `FAQPage` schema site-wide.
- CI (`ci.yml`) and deploy (`deploy.yml`) pipelines.
