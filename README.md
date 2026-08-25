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

| Area | Where |
|---|---|
| Homepage ("Warm Signal" cream/rust design) | `app/page.tsx` |
| Comparison pages | `app/vs/*` |
| Pricing / feature matrix | `app/compare/pricing` |
| Free public domain checker | `app/tools/domain-check` |
| Docs / troubleshooting | `app/docs/*` |
| Legal (draft, pending attorney review) | `app/legal/*` |
| Security disclosure + `security.txt` | `app/security`, `public/.well-known/security.txt` |
| Status page | `app/status` |
| Stripe checkout / webhook / portal skeletons | `app/api/*` |
| Shared design system | `components/*`, `lib/*`, `tailwind.config.ts` |

---

## 🚀 Local development

```bash
npm install
npm run dev       # http://localhost:4402 by default (see package.json)
npm run build     # production build
npm run lint      # ESLint flat config
npm run format    # Prettier
npm run typecheck # tsc --noEmit
```

> **⚠️ Port note:** this repo has no docker-compose services of its own —
> it's a static-leaning marketing site with two thin Stripe API routes, not
> a containerized app. `4402` is just the dev-server port picked to avoid
> colliding with `outreach-infra` (3000/4000/5678), `jitterflow`
> (5433/6380/4100/4101/4200/4300/4401), `gemini-gateway` (8080), and
> `leadhound-engine` (9501) on this shared engineering machine.

---

## 🔑 Environment variables

See `.env.example` for the full list (Stripe keys/price IDs, the license
RSA signing key, the core-engine public API URL for `/tools/domain-check`).
None of these are called live from this repo's build or test tooling.

> **🔑 This repo is the sole license-signing authority.** The Stripe webhook
> (`app/api/stripe/webhook`) and `lib/license.ts` are the ONE real,
> canonical license-issuance implementation for the whole product — per the
> product spec's Support Model, this is the only piece of billing
> infrastructure WarmHawk operates centrally.
> `warmhawk-enterprise-operator`'s `LicenseGate` only ever VERIFIES, holding
> the matching public key — never the private one.

| Variable | Lives in | Purpose |
|---|---|---|
| `LICENSE_SIGNING_PRIVATE_KEY` | **This repo only** | RSA private key, signs every issued license. Never leaves this deployment's secrets. |
| `LICENSE_PUBLIC_KEY_PEM` | `warmhawk-enterprise-operator` | The matching public half — verifies offline, never signs. |

`.env.example` in both repos ships an **obviously test-only** keypair
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

## 🔁 CI/CD

Self-contained workflows in `.github/workflows/` — no external reusable-workflow dependency
(this repo is permanently private — decided 2026-08-25, superseding an earlier assumption that
it would go public at go-live — so keeping CI self-contained here is a simplicity choice, not a
public-repo requirement). `deploy.yml` additionally triggers a Coolify-managed host directly via webhook,
since this is the one WarmHawk repo whose deploy is operated centrally. This repo is meant to
adopt the full `main -> stage -> master` promotion model once it's a real git repo — see
`ci.yml`'s header comment.
