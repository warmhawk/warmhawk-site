import { NextResponse } from 'next/server';

/**
 * Serves the combined WarmHawk installer as a piped shell script. Same get.docker.com/rustup.rs
 * pattern: a GET here returns plain shell text, not JSON — there is no API contract, only a script.
 *
 * TIER 0 IS A REAL PATH THROUGH THIS SCRIPT (2026-08-30 go-live audit finding B4). `--license` used
 * to be a hard requirement, which meant the exact command printed on the homepage hero, the
 * homepage closing CTA, `/docs/quickstart` and warmhawk-core-engine's README —
 * `curl ... | bash -s -- --domain app.yourcompany.com` — died immediately on
 * "--license is required". Every one of those four surfaces is aimed at free-tier users, and the
 * whole open-core pitch depends on that command working. It now installs core-engine alone and
 * exits cleanly, pointing at the Tier 0 quickstart; passing `--license` adds the dashboard exactly
 * as before. `lib/email.ts`'s `buildInstallCommand` emits the licensed form for paying customers.
 *
 * This is an ORCHESTRATOR, not a reimplementation. warmhawk-core-engine's and
 * warmhawk-enterprise-operator's own `scripts/install.sh` are each already a complete, idempotent
 * installer for their own repo (preflight checks, secret generation, TLS bootstrap, etc.) — this
 * script's only job is to fetch both repos and run their installers in the right order with the
 * right flags wired between them:
 *
 *   1. warmhawk-core-engine's install.sh first (Tier 0 needs no license at all).
 *   2. Read back the `OPERATOR_SERVICE_TOKEN` it generates from its own `.env` — the exact value
 *      that repo's own install.sh prints a reminder to copy into the operator's `.env` as
 *      `CORE_ENGINE_SERVICE_TOKEN` (see that file's final log lines) — this script does that copy
 *      automatically instead of asking the customer to do it by hand.
 *   3. warmhawk-enterprise-operator's install.sh with `--license`/`--core-engine-service-token`
 *      wired straight through, plus `--owner-email`. `LicensePayload` (lib/license.ts) carries no
 *      email field, so there is no way to derive the dashboard owner's address from the license
 *      token itself — it has to come in as its own flag, same as enterprise-operator's own
 *      install.sh already requires directly.
 *
 * `--domain` is split into the two subdomains both products' own install.sh usage comments
 * already establish (`api.<domain>` for core-engine, `dashboard.<domain>` for the operator — see
 * warmhawk-core-engine/scripts/install.sh's and warmhawk-enterprise-operator/scripts/install.sh's
 * own `--domain` examples), unless the customer overrides one explicitly with
 * `--api-domain`/`--dashboard-domain`.
 *
 * Repo-source resolution differs by product, and that is permanent, not a pre-launch stopgap:
 *
 *   - warmhawk-core-engine is BSL 1.1 and going public at go-live — CORE_REPO_SOURCE below defaults
 *     to the real, permanent public GitHub URL it will live at, and needs no change once that
 *     happens. Override via `WARMHAWK_CORE_REPO_URL` (same pattern as rustup's
 *     `RUSTUP_UPDATE_ROOT` or Homebrew's `HOMEBREW_BREW_GIT_REMOTE`) — a git remote URL is cloned; a
 *     local filesystem path is copied as-is (including uncommitted working-tree state, useful for
 *     testing a not-yet-committed change before it's public).
 *   - warmhawk-enterprise-operator is PRIVATE FOREVER — that repo's source is never fetched by this
 *     script at all, not now, not after go-live. What the customer's box gets instead is a small
 *     "deploy tooling" tarball (install.sh, docker-compose.yml, nginx config — no application code)
 *     from `app/api/operator-deploy-tooling`, plus a prebuilt image pulled from a registry proxy
 *     (`app/api/registry/token`) authenticated with the customer's own `--license` token acting as
 *     the pull credential. See those two routes' own doc comments for the full design.
 */
const INSTALL_SCRIPT = `#!/usr/bin/env bash
#
# WarmHawk combined installer -- brings up both warmhawk-core-engine (Tier 0) and
# warmhawk-enterprise-operator (the licensed dashboard) on one fresh server from a single command.
# See https://warmhawk.com/install's own route source (app/install/route.ts) for the full design
# rationale. Safe to re-run: each product's own install.sh is independently idempotent, and this
# script reuses an already-fetched checkout rather than re-cloning over it.
#
# Usage:
#   Tier 0 (free, API-only -- installs the core engine and nothing else):
#     curl -fsSL https://warmhawk.com/install | bash -s -- --domain yourcompany.com
#
#   Tier 1/2 (adds the licensed operator dashboard):
#     curl -fsSL https://warmhawk.com/install | bash -s -- \\
#       --license <token-from-your-purchase-email> \\
#       --domain yourcompany.com --owner-email you@yourcompany.com
#
#   --license takes the FULL token from your purchase email (a long two-part string), not the
#   short whk_live_ identifier printed alongside it.
#
# Optional overrides:
#   --api-domain <domain>                (default: api.<domain>)
#   --dashboard-domain <domain>          (default: dashboard.<domain>)
#   --core-engine-source <src>           (default: \$WARMHAWK_CORE_REPO_URL or the public GitHub repo)
#   --operator-deploy-tooling-url <url>  (default: \$OPERATOR_DEPLOY_TOOLING_URL or
#                                         https://warmhawk.com/api/operator-deploy-tooling --
#                                         install.sh/docker-compose.yml/nginx config only, never
#                                         warmhawk-enterprise-operator's application source, which
#                                         stays in that permanently-private repo and never reaches
#                                         this script at all)
#   --install-dir <path>                 (default: \$WARMHAWK_INSTALL_DIR or ~/warmhawk)
set -euo pipefail

log()  { echo "[warmhawk-install] \$*"; }
fail() {
  echo "[warmhawk-install] ERROR: \$*" >&2
  exit 1
}

# CORE_REPO_SOURCE: real, permanent default -- becomes correct with zero changes once
# warmhawk-core-engine goes public. Override for internal staging/testing (a git remote is cloned;
# a local path is copied as-is).
CORE_REPO_SOURCE="\${WARMHAWK_CORE_REPO_URL:-https://github.com/warmhawk/warmhawk-core-engine.git}"
# OPERATOR_DEPLOY_TOOLING_URL: NOT a repo source -- warmhawk-enterprise-operator is private forever
# and this script never clones it. This is this repo's own endpoint serving just the deploy tooling
# tarball (install.sh/docker-compose.yml/nginx config); see app/api/operator-deploy-tooling/route.ts.
OPERATOR_DEPLOY_TOOLING_URL="\${OPERATOR_DEPLOY_TOOLING_URL:-https://warmhawk.com/api/operator-deploy-tooling}"
INSTALL_DIR="\${WARMHAWK_INSTALL_DIR:-\$HOME/warmhawk}"

LICENSE=""
DOMAIN=""
OWNER_EMAIL=""
API_DOMAIN=""
DASHBOARD_DOMAIN=""

while [ \$# -gt 0 ]; do
  case "\$1" in
    --license) LICENSE="\$2"; shift 2 ;;
    --domain) DOMAIN="\$2"; shift 2 ;;
    --owner-email) OWNER_EMAIL="\$2"; shift 2 ;;
    --api-domain) API_DOMAIN="\$2"; shift 2 ;;
    --dashboard-domain) DASHBOARD_DOMAIN="\$2"; shift 2 ;;
    --core-engine-source) CORE_REPO_SOURCE="\$2"; shift 2 ;;
    --operator-deploy-tooling-url) OPERATOR_DEPLOY_TOOLING_URL="\$2"; shift 2 ;;
    --install-dir) INSTALL_DIR="\$2"; shift 2 ;;
    *) fail "Unknown argument: \$1 (expected --license, --domain, --owner-email, and optionally --api-domain/--dashboard-domain/--core-engine-source/--operator-deploy-tooling-url/--install-dir)" ;;
  esac
done

# --domain is the only universally required flag. --license is what selects the tier:
#   absent  -> Tier 0 (free): core-engine only, no dashboard, no license needed.
#   present -> Tier 1/2: core-engine + the licensed operator dashboard, which also needs
#              --owner-email to send the owner their setup link.
[ -z "\$DOMAIN" ] && fail "--domain is required (e.g. --domain yourcompany.com)."
if [ -n "\$LICENSE" ] && [ -z "\$OWNER_EMAIL" ]; then
  fail "--owner-email is required alongside --license -- it's the address that receives the dashboard owner's setup link."
fi

API_DOMAIN="\${API_DOMAIN:-api.\$DOMAIN}"
DASHBOARD_DOMAIN="\${DASHBOARD_DOMAIN:-dashboard.\$DOMAIN}"

command -v git >/dev/null 2>&1 || fail "git is not installed -- required to fetch warmhawk-core-engine. Install git first."
command -v curl >/dev/null 2>&1 || fail "curl is not installed."
command -v tar >/dev/null 2>&1 || fail "tar is not installed -- required to extract the operator deploy-tooling tarball."

mkdir -p "\$INSTALL_DIR"

# fetch_source: reuses an already-fetched checkout untouched (each product's own install.sh is
# independently idempotent on top of that -- re-fetching here would risk clobbering a
# not-yet-committed .env or other generated state). Delete the destination directory yourself
# first if you genuinely want a clean re-fetch.
fetch_source() {
  local source="\$1" dest="\$2" label="\$3"
  if [ -d "\$dest" ] && [ -n "\$(ls -A "\$dest" 2>/dev/null)" ]; then
    log "\${label} already present at \${dest} -- reusing it."
    return 0
  fi
  case "\$source" in
    http://*|https://*|git@*|ssh://*)
      log "Cloning \${label} from \${source}..."
      git clone --depth 1 "\$source" "\$dest"
      ;;
    *)
      [ -d "\$source" ] || fail "\${label} source '\${source}' is neither a URL nor a local directory."
      log "Copying \${label} from local path \${source}..."
      mkdir -p "\$dest"
      cp -a "\$source/." "\$dest/"
      ;;
  esac
}

# --- 1. warmhawk-core-engine (Tier 0 -- no license needed) --------------------------------------
CORE_DIR="\$INSTALL_DIR/warmhawk-core-engine"
fetch_source "\$CORE_REPO_SOURCE" "\$CORE_DIR" "warmhawk-core-engine"

log "Installing WarmHawk Core Engine at https://\${API_DOMAIN}/ ..."
( cd "\$CORE_DIR" && ./scripts/install.sh --domain "\$API_DOMAIN" )

# --- 2. Tier 0 stops here -----------------------------------------------------------------------
# No license means no dashboard to install: the operator repo is the licensed component, and Tier 0
# is "direct API endpoints, no web UI" by design. Finish with the real next step rather than
# silently doing nothing, so a free-tier install ends somewhere useful.
if [ -z "\$LICENSE" ]; then
  log "Done. WarmHawk Core Engine (Tier 0, free) is running at https://\${API_DOMAIN}/"
  log ""
  log "Next: create your first API user and send a test campaign --"
  log "  https://warmhawk.com/docs/quickstart"
  log ""
  log "Tier 0 is API-only. To add the operator dashboard (queue inspector, domain health,"
  log "unified reply inbox, team management), get a license at https://warmhawk.com/checkout"
  log "and re-run this same command with --license <token> --owner-email <you@yourcompany.com>."
  exit 0
fi

CORE_ENV="\$CORE_DIR/.env"
[ -f "\$CORE_ENV" ] || fail "warmhawk-core-engine's install completed but \${CORE_ENV} is missing -- cannot read its OPERATOR_SERVICE_TOKEN."
CORE_SERVICE_TOKEN="\$(grep -m1 '^OPERATOR_SERVICE_TOKEN=' "\$CORE_ENV" | cut -d= -f2-)"
[ -n "\$CORE_SERVICE_TOKEN" ] || fail "Could not read OPERATOR_SERVICE_TOKEN from \${CORE_ENV} after install -- check: cat \${CORE_ENV}"

# --- 3. warmhawk-enterprise-operator (dashboard, license-gated) --------------------------------
# NOT a git clone -- that repo is permanently private and its application source must never reach
# a customer's box (see this file's module doc). What lands here is deploy tooling only
# (install.sh/docker-compose.yml/nginx config), fetched from THIS repo's own endpoint; the actual
# application ships as a prebuilt image that install.sh below pulls straight from the registry
# proxy, authenticated with \$LICENSE itself -- see app/api/registry/token/route.ts.
OPERATOR_DIR="\$INSTALL_DIR/warmhawk-enterprise-operator"
mkdir -p "\$OPERATOR_DIR"
if [ -d "\$OPERATOR_DIR" ] && [ -n "\$(ls -A "\$OPERATOR_DIR" 2>/dev/null)" ]; then
  log "warmhawk-enterprise-operator deploy tooling already present -- reusing it."
else
  log "Fetching warmhawk-enterprise-operator deploy tooling (install.sh/docker-compose.yml/nginx config only -- application source never leaves WarmHawk's private repo)..."
  curl -fsSL "\$OPERATOR_DEPLOY_TOOLING_URL" | tar -xz -C "\$OPERATOR_DIR"
fi

log "Installing WarmHawk Enterprise Operator (dashboard) at https://\${DASHBOARD_DOMAIN}/ ..."
( cd "\$OPERATOR_DIR" && ./scripts/install.sh \\
    --license "\$LICENSE" \\
    --domain "\$DASHBOARD_DOMAIN" \\
    --core-engine-url "https://\${API_DOMAIN}" \\
    --core-engine-service-token "\$CORE_SERVICE_TOKEN" \\
    --owner-email "\$OWNER_EMAIL" )

log "Done. Core Engine: https://\${API_DOMAIN}/ -- Dashboard: https://\${DASHBOARD_DOMAIN}/"
log "See the owner setup link in warmhawk-enterprise-operator's own install.sh output above."
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
