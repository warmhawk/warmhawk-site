# warmhawk-site stage deploy: own nginx+certbot sidecar (plain HTTP-01)

## Context

`warmhawk-site`'s stage target (SaaS-Stage, 95.217.208.54) has no public HTTP/HTTPS exposure today — [docker-compose.deploy.yml](Organizations/warmhawk.com/warmhawk-site/docker-compose.deploy.yml) runs one `web` service bound to `127.0.0.1:4600` only.

**Revision 2026-08-26:** the original version of this plan had `jitterflow-core-app`'s edge-nginx permanently owning 80/443 on this box, forcing warmhawk-site into a fallback-port + Cloudflare-DNS-01 design. That's no longer true — `jitterflow-core-app`'s edge-nginx moved to 2082/2083 on SaaS-Stage specifically to make room here (see its `ops/edge-nginx/README.md`, "Off default ports — SaaS-Stage only", and `ks-platform-infra/servers/saas-stage.md`'s port table). warmhawk-site now gets 80/443 directly and uncontested — no fallback ports, no Cloudflare API token, no DNS-01 plugin. It uses the exact same plain HTTP-01 `certbot certonly --webroot` pattern `warmhawk-core-engine`'s own customer-facing [scripts/install.sh](Organizations/warmhawk.com/warmhawk-core-engine/scripts/install.sh) already ships and tests — full consistency across all three warmhawk repos now, not a stage-only special case.

Approach confirmed: **warmhawk-site brings its own nginx+certbot sidecar**, binding 80/443 directly, with a cert issued via **plain HTTP-01** (`certbot/certbot` + webroot challenge — same image/method core-engine uses). All application activation happens through the user's own Woodpecker deploy run, never a direct SSH session by the agent (per the permanent no-direct-prod-app-deploys rule).

**Ordering dependency:** jitterflow-stage's cutover to 2082/2083 (`ks-platform-infra`/`jitterflow-core-app` changes, already made) must be live on SaaS-Stage *before* warmhawk-site's nginx sidecar first tries to bind 80/443 there — otherwise the two containers collide on the same host-network ports. See Section 4.

---

## 1. `warmhawk-site` repo changes

### `docker-compose.deploy.yml`
Add two services alongside the existing `web` (left untouched):

- **`nginx`** — `build: { context: ./nginx }`, `ports: ['80:80', '443:443']` (no fallback — this box has no other claimant on these ports), `environment: { WARMHAWK_SITE_DOMAIN }`, mounts `certbot_conf:/etc/letsencrypt:ro` and `certbot_www:/var/www/certbot:ro`, `depends_on: [web]`. No custom `networks:` block — reaches `web` via the implicit default bridge's service-name DNS (`web:4600`), same as today.
- **`certbot`** — image `certbot/certbot:v2.11.0` (plain image, no DNS plugin needed). `entrypoint: /bin/sh`, loop: `certbot renew --webroot -w /var/www/certbot` every 12h. Mounts `certbot_conf:/etc/letsencrypt` and `certbot_www:/var/www/certbot` (read-write — this is the one service that writes challenge files there).
- New top-level volumes `certbot_conf` and `certbot_www` (the latter is the ACME webroot both nginx and certbot need to share).

### `nginx/Dockerfile` (new)
Same shape as core-engine's: `FROM nginx:1.27-alpine`, copy `nginx.conf.template` into `/etc/nginx/templates/`, `rm -f /etc/nginx/conf.d/default.conf`.

### `nginx/nginx.conf.template` (new)
Single upstream (`web:4600` — this app has no per-route API split like core-engine). HTTP `server` block includes `location /.well-known/acme-challenge/ { root /var/www/certbot; }` (matched before anything else) so Let's Encrypt's validation request actually resolves, then falls through to the usual redirect-to-HTTPS for everything else. A **commented-out** `listen 443 ssl` block behind the marker `# --- Enabled by scripts/deploy-nginx-setup.sh's enable_tls_template() once a cert exists ---`, flipped only after a real cert exists (nginx validates `ssl_certificate` paths at config-load time — same reason core-engine's template ships this way). Include `proxy_set_header X-Forwarded-Proto` (core-engine's template omits it, but Next.js needs it for correct absolute-URL generation).

### `scripts/deploy-nginx-setup.sh` (new)
Invoked on the box before `docker compose up -d` (via `preUpCommands`, see Section 2). Flags: `--domain --project-name --compose-file`, plus a `--skip-certbot` escape hatch for the e2e test. No port-detection logic at all — unlike core-engine's install.sh, this box has exactly one thing on it wanting 80/443, so there's nothing to fall back from.

1. **Issue/renew via HTTP-01, idempotently:** `docker compose ... run --rm certbot certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos -m admin@warmhawk.com --keep-until-expiring`. `--keep-until-expiring` makes repeated calls no-ops when the cert is still valid. Check `certbot certificates -d "$DOMAIN"` first to tell first-issuance from renewal: **fail the script (non-zero exit, blocks the deploy)** if there's no existing cert and issuance fails; **warn and continue** if a cert already exists and only renewal failed (the 12h-loop container gets another shot, and blocking a routine code deploy over a transient hiccup is disproportionate).
2. **Flip the TLS marker** — reuse `enable_tls_template()` verbatim (same `awk` script core-engine's install.sh uses), pointed at this repo's `nginx/nginx.conf.template`.
3. **Explicitly rebuild the nginx image**: `docker compose ... build nginx`. Necessary because `nginx` is `build:`-only with no `image:`, and the plain `docker compose up -d` that `ssh-deploy.ts` generates (no `--build` flag) won't rebuild just because the template file changed on disk — without this step, the marker flip would silently never take effect after the first deploy.

**Known risk, not a blocker:** if `stage.warmhawk.com`'s Cloudflare DNS record is proxied (it should be, for the WAF/CDN benefit) and the zone has "Always Use HTTPS" or a similar redirect rule active, the plain-HTTP ACME validation request could get redirected before it ever reaches nginx's `/.well-known/acme-challenge/` location, failing issuance. This is the exact same risk any real self-hosted customer behind Cloudflare would hit — core-engine's install.sh doesn't special-case it either. If the first real issuance fails this way, the fix is a Cloudflare Configuration Rule exempting `/.well-known/acme-challenge/*` from the redirect — not a code change here.

### `tests/e2e-nginx/test-cert-issuance.sh` (new, replaces the port-fallback test)
No more port-fallback to test (nothing to fall back from). Instead: bring up `nginx`+`web` locally via `docker compose`, run `deploy-nginx-setup.sh --skip-certbot`, and assert (a) nginx serves a file placed under the webroot at `/.well-known/acme-challenge/test-token` — proving the mount + location block actually work end to end, and (b) `enable_tls_template()` flips the marker correctly and the rebuilt nginx image loads the resulting config without error (`nginx -t`). Real HTTP-01 issuance against a live ACME server stays out of scope locally (same reasoning as before) — that's exercised for real by the first live stage deploy, and any breakage there surfaces via the existing `verify-stage` Playwright run against `https://stage.warmhawk.com`.

---

## 2. `ks-woodpecker-config` changes

Unchanged in shape from the original plan — this machinery (getting `preUpCommands` to actually run on a manual deploy-stage trigger) is independent of DNS-01 vs HTTP-01.

- **[src/templates/product-full.ts](ks-woodpecker-config/src/templates/product-full.ts)**: add optional `stagePreUpCommands?: string[]` to `ProductFullParams`. At line ~809, change `preUpCommands: params.stage ? [stripeGuardLine] : undefined` to append: `params.stage ? [stripeGuardLine, ...(params.stagePreUpCommands ?? [])] : undefined`. Omitted → byte-identical output (matches this file's existing convention for every optional field), so jitterflow-core-app is unaffected.
- **[src/templates/deploy-stage.ts](ks-woodpecker-config/src/templates/deploy-stage.ts)**: `DeployStageParams`'s `Pick<...>` currently omits `preUpCommands` entirely from its `buildSshDeployStep()` call (line ~104-112) — today a manual "Deploy" trigger skips even the Stripe-guard check. Add `stagePreUpCommands` to the `Pick<>` list and pass `preUpCommands: params.stagePreUpCommands` through. Flag this as an incidental fix alongside the main change (manual redeploys currently bypass `preUpCommands` for every repo, not just warmhawk-site).
- **[src/repo-map.ts](ks-woodpecker-config/src/repo-map.ts)**: in the `warmhawk/warmhawk-site` entry, add:
  ```ts
  stagePreUpCommands: [
    './scripts/deploy-nginx-setup.sh --domain stage.warmhawk.com --project-name warmhawk-stage --compose-file docker-compose.deploy.yml',
  ],
  ```
  Replace the stale header comment above this entry (lines ~403-407, describing an abandoned "shared, product-agnostic edge-nginx" plan referencing a `ks-platform-infra/deployed/saas-stage-edge-nginx/` path that was never created) with a note describing the now-confirmed own-nginx+certbot, plain-HTTP-01 approach.
- **`test/render.test.ts`**: extend the existing `'warmhawk/warmhawk-site on push'` and `'... deploy_to=stage'` tests to assert the `deploy-nginx-setup.sh` invocation appears in `deployStageCmd`, positioned after the `git fetch && git reset --hard @{u}` + Stripe guard and before `docker pull`/`up -d`. Add one isolated test for `ProductFullParams.stagePreUpCommands` itself: omitted → unchanged output (regression guard); provided → appended after the Stripe guard, in order.

---

## 3. One-time Cloudflare + box setup (outside any pipeline)

Drastically smaller than the original DNS-01 version — no Origin Rule, no API token on the box at all for warmhawk-site.

- **Confirm the `A` record**: `stage.warmhawk.com` → `95.217.208.54`, proxied. (If it doesn't already exist, create it — one API call or a dashboard click; doesn't need its own script given there's nothing else to make idempotent alongside it.)
- No Cloudflare Origin Rule needed for warmhawk-site — it owns 80/443 directly, so Cloudflare's default proxied routing (edge port → same origin port) already lands in the right place. (Compare `jitterflow-core-app`'s stage box, which *does* need one now — see `ks-platform-infra/scripts/setup-cloudflare-jitterflow-stage-origin.sh` — because it moved off its default ports and warmhawk-site didn't.)
- No credential file to provision on the box — `certbot/certbot` needs no Cloudflare token, unlike the DNS-01 plugin image the original plan used.

---

## 4. Rollout sequence

1. **Prerequisite — confirm jitterflow-stage's port cutover is live** on SaaS-Stage (`ops/edge-nginx` off 80/443, `stage.jitterflow.io` verified reachable on 2082/2083 via its Cloudflare Origin Rule). Don't proceed to step 4 until this is confirmed — warmhawk-site's nginx binding to 80/443 while jitterflow's edge-nginx is still there will fail to start.
2. Commit + push `warmhawk-site` changes (Section 1) to `main`, after running the new e2e test locally (fully Docker-local, no real box needed).
3. Commit + push `ks-woodpecker-config` changes (Section 2) — must land before step 5, or warmhawk-site's next generated pipeline won't include the new `preUpCommands` step.
4. Confirm the one-time Cloudflare DNS setup (Section 3).
5. **Hand off, don't deploy**: tell the user warmhawk-site is ready and ask them to trigger the next real push-triggered pipeline (or a manual `deploy-stage` via Woodpecker's "Deploy" dialog) themselves — the first `docker compose up -d` that brings up `nginx`/`certbot` must happen through that real Woodpecker run.
6. After that run, check its `deploy-stage` logs for cert issuance and confirm `verify-stage`'s live Playwright run against `https://stage.warmhawk.com` passes — the real end-to-end confirmation that DNS, the cert, and nginx's proxy are all correct together.

## Verification

- `warmhawk-site`: `bash tests/e2e-nginx/test-cert-issuance.sh` locally — asserts the ACME webroot path is served correctly and the TLS marker flip produces a valid nginx config.
- `ks-woodpecker-config`: `npm test` (all existing + new `render.test.ts` cases) and `npm run typecheck`.
- `jitterflow-core-app` / `ks-platform-infra` (prerequisite, Section 4 step 1): `stage.jitterflow.io` reachable over HTTPS through Cloudflare after the port cutover — see that repo's own README for its verification steps.
- End-to-end: the real Woodpecker `deploy-stage` pipeline run (step 5/6 above) plus its `verify-stage` Playwright gate against the live `https://stage.warmhawk.com` URL — this is what actually proves DNS + cert + nginx all work together; no local test can substitute for it.
