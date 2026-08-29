# 🦅 warmhawk-site

Public marketing/informational site for **WarmHawk** — self-hosted,
single-tenant cold-email infrastructure. No product code, no proprietary
logic lives here; that's `warmhawk-core-engine` and
`warmhawk-enterprise-operator`, both separate repos.

> **🔑 One-liner:** WarmHawk runs entirely on your own server — own
> containers, own database, own nginx, own TLS certificate — with zero
> per-seat fees and real deliverability data instead of a vanity warmup
> score.

---

## 🗂️ What's in this repo

| Area                                                                        | Where                                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Homepage ("Warm Signal" cream/rust design)                                  | `app/page.tsx`                                                                          |
| Comparison pages                                                            | `app/vs/*`                                                                              |
| Pricing / feature matrix                                                    | `app/compare/pricing`                                                                   |
| Free public domain checker                                                  | `app/tools/domain-check`                                                                |
| Docs / troubleshooting                                                      | `app/docs/*`                                                                            |
| Legal (draft, pending attorney review)                                      | `app/legal/*`                                                                           |
| Security disclosure + `security.txt`                                        | `app/security`, `public/.well-known/security.txt`                                       |
| Status page                                                                 | `app/status`                                                                            |
| Stripe checkout / webhook / portal skeletons                                | `app/api/*`                                                                             |
| Shared design system                                                        | `components/*`, `lib/*`, `tailwind.config.ts`                                           |
| App-wide constants (name, URLs, support/security/hello/billing emails, nav) | `lib/siteConfig.ts` — the one file to edit when any of these change                     |
| Docker build + deploy compose                                               | `docker/Dockerfile.web`, `docker/docker-compose.deploy.yml`                             |
| Env var templates                                                           | `.env/.env.example` (documented full list), `.env/.env.local` (docker e2e placeholders) |

---

## 🚀 Local development

```bash
npm install
npm run dev       # http://localhost:4800 by default (see package.json)
npm run build     # production build
npm run lint      # ESLint flat config
npm run format    # Prettier
npm run typecheck # tsc --noEmit
```

> **⚠️ Port note:** this repo owns its own registered block, **4800-4809**,
> in the PC-wide local-dev port registry — `4800` (`npm run dev`) and `4801`
> (`npm run test:e2e:docker`'s throwaway container, see
> `scripts/e2e-docker-up.sh`). The old `4402` default silently collided with
> `jitterflow-core-app`'s `webhook-echo` container (also `4402` by default) —
> this repo previously claimed to avoid jitterflow's ports based on a stale,
> incomplete list. Check the registry memory before picking a new port here.

---

## 🔑 Environment variables

See `.env/.env.example` for the full list (Stripe keys/price IDs, the license
RSA signing key, the core-engine public API URL for `/tools/domain-check`).
None of these are called live from this repo's build or test tooling.

> **🔑 This repo is the sole license-signing authority.** The Stripe webhook
> (`app/api/stripe/webhook`) and `lib/license.ts` are the ONE real,
> canonical license-issuance implementation for the whole product — per the
> product spec's Support Model, this is the only piece of billing
> infrastructure WarmHawk operates centrally.
> `warmhawk-enterprise-operator`'s `LicenseGate` only ever VERIFIES, holding
> the matching public key — never the private one.

| Variable                      | Lives in                       | Purpose                                                                              |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `LICENSE_SIGNING_PRIVATE_KEY` | **This repo only**             | RSA private key, signs every issued license. Never leaves this deployment's secrets. |
| `LICENSE_PUBLIC_KEY_PEM`      | `warmhawk-enterprise-operator` | The matching public half — verifies offline, never signs.                            |

This repo's `.env/.env.example` and `warmhawk-enterprise-operator`'s own `.env.example` both ship
an **obviously test-only** keypair
(clearly marked, never use in production) so local dev / CI can sign and
verify a real token end-to-end with zero setup. Run
`scripts/generate-license-keypair.sh` once, at launch, to generate the real
production keypair — it prints exactly which env var goes in which repo's
deployment secrets, plus a SHA-256 fingerprint to confirm both sides
received the matching key without ever comparing the private key itself.

---

## 🧩 Design system

- **Palette:** cream (`#faf5ee`) / cream-elevated (`#f2e9db`) background,
  ink (`#332a22`) text, rust (`#c1531f`) accent — pulled 1:1 from the
  finalized homepage design artifact referenced in the product spec
  (Phase 1, Branding). Footer keeps a fixed dark palette
  (`#0a100d`/`#135c40`/`#eaf6ee`) on every theme, matching the design
  exactly.
- **Fonts:** Lora (display/headings) + Work Sans (body).
- **Shared components:** `Nav`, `Footer`, `DraftBanner` (legal pages),
  `ComparisonCallout` (the standing "own infrastructure" block on every
  `/vs/*` page), `FaqSection` (renders both the visible FAQ and its
  `FAQPage` JSON-LD schema), `PricingTable`, `AnswerBlock` (AEO 40–60 word
  direct-answer blocks), `StatCite` (inline cited statistics), `CheckBadge`
  (PASS/FAIL/PENDING).

---

## 📈 SEO / AEO baseline

Applied site-wide, not per-page:

- [x] `sitemap.xml` / `robots.txt` generated at build time (`app/sitemap.ts`, `app/robots.ts`).
- [x] Open Graph + Twitter Card metadata + canonical URL on every page (`lib/seo.ts`'s `pageSeo()`).
- [x] `FAQPage` schema with question-shaped headings on every page that ships an FAQ section.
- [x] 40–60 word direct-answer blocks at the top of major sections.
- [x] Cited statistics (sourced from the product spec's Competitor Pain Points table) roughly every 150–200 words on comparison pages.

---

## 🚧 `/vs/instantly` — do not publish yet

This page is built but intentionally `noindex`'d, excluded from the
sitemap, and disallowed in `robots.txt`. It's gated on the seed-inbox
placement test feature shipping in `warmhawk-core-engine` first — see the
product spec's Guardrails section and Go-Live Checklist. Do not remove the
`noindex` / do-not-publish markers without confirming that feature has
actually shipped.

---

## 🧪 Testing

| Tier           | Command                      | What it hits                                                                                                                                      |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit           | `npm run test:unit`          | Mocked `@/lib/stripe`/`@/lib/email` — no network, ever. Matches plain `npm test`.                                                                 |
| Integration    | `npm run test:integration`   | **Real** Stripe TEST-mode API + real Resend send. Self-skips cleanly when secrets are absent.                                                     |
| E2E (Docker)   | `npm run test:e2e:docker`    | Builds/runs this repo's own `docker/Dockerfile.web`, reuses the existing `tests/e2e/*.spec.ts` specs against it, always tears the container down. |
| Human journeys | `npm run test:human`         | A real, browser-driven Stripe checkout + license-email round trip against an already-deployed target.                                             |
| Load (k6)      | `k6 run tests/load/stage.js` | Read-only marketing/docs page rendering only — never `/api/checkout/session`.                                                                     |

> **⚠️ Integration and human-journey tests deliberately override this repo's "no live external
> network calls" build policy** (see `lib/stripe.ts`'s / `lib/email.ts`'s header comments — that
> policy still governs the plain `*.test.ts` unit suite only). They make real calls to Stripe's
> real TEST-mode API and Resend's real API/SMTP relay, reading secrets from the env vars documented
> in `.env/.env.example`. Until those secrets are provisioned as CI secrets, both tiers self-skip
> cleanly rather than fail.

**Human-journey target:** resolved from `HUMAN_ENV` (`local` | `stage` | `prod`, default `local`
— see `tests/human-journeys/targets.ts`). There's no `HUMAN_ENV`-prefixed npm script for each
target; just set the env var inline:

```bash
HUMAN_ENV=stage npm run test:human
```

`prod` is accepted by `targets.ts` but the real-purchase test itself hard-skips whenever
`target.label === 'prod'` — a real checkout must never run automatically against the live site.

---

## 🔁 CI/CD

No pipeline config lives in this repo — like every other KS-LLC-org repo, it runs on
self-hosted Woodpecker, generated centrally from `ks-woodpecker-config`'s `repo-map.ts`
(`warmhawk/warmhawk-site` entry). Push-to-`main` builds the image (`docker/Dockerfile.web`),
pushes it to `ghcr.io/warmhawk/warmhawk-site`, and deploys via `docker/docker-compose.deploy.yml`
(the "own repo, git-pull" pattern — pulls the pushed image, no on-box rebuild). This repo is
permanently private (decided 2026-08-25, superseding an earlier assumption it would go public at
go-live).
