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
| Self-serve billing (email → Stripe Customer Portal)                         | `app/account/billing`                                                                   |
| Stripe checkout / webhook / portal / license issuance + refresh             | `app/api/*`                                                                             |
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

## 🔄 License lifecycle

A license is a signed token, not a database row — this repo has no database. The
signature _is_ the record, so every step below is stateless and verifiable offline.

| Step                   | Route                                    | What happens                                                                                                                                               |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Issue**              | `app/api/stripe/webhook`                 | `checkout.session.completed` / `invoice.paid` mints a token and emails the install command.                                                                |
| **Persist**            | (same webhook)                           | The token is written back onto the Stripe **subscription's metadata**, split across `warmhawk_license_1`/`_2` (Stripe caps a metadata value at 500 chars). |
| **Refresh**            | `app/api/license/refresh`                | The dashboard presents its **current, possibly expired** token; entitlement is re-derived from the live subscription and a fresh token comes back.         |
| **Self-serve billing** | `app/account/billing` → `app/api/portal` | Paste the token, land in the Stripe Customer Portal — card, invoices, monthly ⇄ annual, cancel.                                                            |

> **🔑 Why the token is the credential.** A valid RSA signature proves the caller
> holds a license this deployment actually issued, and the signed payload names the
> Stripe customer to look up. So there is no shared secret to provision, no password,
> and no `customerId` parameter for an attacker to enumerate. `/api/portal` accepts a
> token **only** — a `stripeCustomerId` in the request body is ignored outright.

**Expiry never grants access on its own.** `authenticateLicenseToken` deliberately
accepts an expired token (a dashboard asking to renew is, by definition, holding one),
so tier and expiry are always recomputed from Stripe — never copied from the old
payload. A cancelled or `unpaid` customer gets a **402**; `past_due` still refreshes,
because locking someone out mid-dunning over a transient card decline is exactly the
jarring failure the daily re-validation design exists to avoid.

The operator side of this loop — the daily auto-refresh and the **Refresh license**
button on the expired screen — lives in `warmhawk-enterprise-operator`
(`src/lib/license/refresh.ts`), and re-verifies whatever this endpoint returns against
its own public key before storing it.

---

## 🧩 Design system

- **Palette:** cream (`#faf5ee`) / cream-elevated (`#f2e9db`) background,
  ink (`#332a22`) text, rust (`#c1531f`) accent — pulled 1:1 from the
  finalized homepage design artifact referenced in the product spec
  (Phase 1, Branding). Footer keeps a fixed dark palette
  (`#0a100d`/`#135c40`/`#eaf6ee`) on every theme, matching the design
  exactly.
- **Fonts:** Lora (display/headings) + Work Sans (body).
- **Shared components:** `Nav`, `Footer`,
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

## 🚧 `/vs/instantly` — built, still unpublished

This page is built but intentionally `noindex`'d, excluded from the
sitemap, and disallowed in `robots.txt`.

**The original gate has cleared.** It was blocked on the seed-inbox placement
test shipping in `warmhawk-core-engine`; that feature now exists on both sides
— `seedPlacement.ts` / `seedPlacementPoller.ts` in the engine, and
`dashboard/seed-accounts` + `placement-detail-dialog.tsx` in the operator.

**What still gates it** is no longer a code question, which is why nothing in
CI can decide it:

| Gate                                                                         | Who clears it                           |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| Seed placement confirmed working against **live production**, not just tests | Human attestation — by hand, on purpose |
| The two publish flags flipped once that's confirmed                          | Same                                    |

> **⚠️ Don't remove the `noindex` / do-not-publish markers as a code cleanup.**
> This page makes a public, named comparative claim about a competitor. It
> publishes when someone has actually watched placement work in production and
> says so — not when the feature merely compiles.

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

**Stage env vars:** `HUMAN_ENV=stage` loads `.env/.env.stage` EXCLUSIVELY — no merging with, or
fallback to, `.env/.env.local`/`.env/.env.example` (see `scripts/load-env.js`, wired into
`tests/human-journeys/human.config.ts`). Copy `.env/.env.stage.example` (committed, placeholders
only) to `.env/.env.stage` (gitignored) and fill in real Stripe test-mode + Resend + license-signing
values by hand — this is for local/dev parity only and never changes how Woodpecker CI injects
secrets into the deployed stage server itself (`from_secret` there stays authoritative).

`prod` is accepted by `targets.ts` but the real-purchase test itself hard-skips whenever
`target.label === 'prod'` — a real checkout must never run automatically against the live site.

---

## 🔁 CI/CD

No pipeline config lives in this repo — like every other KS-LLC-org repo, it runs on
self-hosted Woodpecker, generated centrally from `ks-woodpecker-config`'s `repo-map.ts`
(`warmhawk/warmhawk-site` entry). Push-to-`main` builds the image (`docker/Dockerfile.web`),
pushes it to `ghcr.io/warmhawk/web`, and deploys via `docker/docker-compose.deploy.yml`
(the "own repo, git-pull" pattern — pulls the pushed image, no on-box rebuild). This repo is
permanently private (decided 2026-08-25, superseding an earlier assumption it would go public at
go-live).
