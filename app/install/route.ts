import { NextResponse } from 'next/server';

/**
 * Serves the combined WarmHawk installer as a piped shell script — `curl -fsSL
 * https://warmhawk.com/install | bash -s -- --license <token> --domain <domain> --owner-email
 * <email>`, exactly the command `lib/email.ts`'s `sendLicenseEmail` puts in every real license
 * email (see that file's `buildInstallCommand`). Same get.docker.com/rustup.rs-style pattern: a
 * GET here returns plain shell text, not JSON — there is no API contract, only a script.
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
 * Repo-source resolution (both product repos are PRIVATE as of this build, pre-launch): the
 * defaults below are the real, permanent public GitHub URLs these repos will live at once they go
 * public — nothing here needs to change when that happens. Until then, or for internal
 * staging/testing, override via `WARMHAWK_CORE_REPO_URL` / `WARMHAWK_OPERATOR_REPO_URL` (same
 * pattern as rustup's `RUSTUP_UPDATE_ROOT` or Homebrew's `HOMEBREW_BREW_GIT_REMOTE`) — a git
 * remote URL is cloned; a local filesystem path is copied as-is (including uncommitted working-
 * tree state, useful for testing a not-yet-committed change to either repo before it's public).
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
#   curl -fsSL https://warmhawk.com/install | bash -s -- \\
#     --license whk_live_XXXX --domain yourcompany.com --owner-email you@yourcompany.com
#
# Optional overrides:
#   --api-domain <domain>        (default: api.<domain>)
#   --dashboard-domain <domain>  (default: dashboard.<domain>)
#   --core-engine-source <src>   (default: \$WARMHAWK_CORE_REPO_URL or the public GitHub repo)
#   --operator-source <src>      (default: \$WARMHAWK_OPERATOR_REPO_URL or the public GitHub repo)
#   --install-dir <path>         (default: \$WARMHAWK_INSTALL_DIR or ~/warmhawk)
set -euo pipefail

log()  { echo "[warmhawk-install] \$*"; }
fail() {
  echo "[warmhawk-install] ERROR: \$*" >&2
  exit 1
}

# Real, permanent defaults -- these become correct with zero changes once both repos go public.
# Override for internal staging/testing (a git remote is cloned; a local path is copied as-is).
CORE_REPO_SOURCE="\${WARMHAWK_CORE_REPO_URL:-https://github.com/warmhawk/warmhawk-core-engine.git}"
OPERATOR_REPO_SOURCE="\${WARMHAWK_OPERATOR_REPO_URL:-https://github.com/warmhawk/warmhawk-enterprise-operator.git}"
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
    --operator-source) OPERATOR_REPO_SOURCE="\$2"; shift 2 ;;
    --install-dir) INSTALL_DIR="\$2"; shift 2 ;;
    *) fail "Unknown argument: \$1 (expected --license, --domain, --owner-email, and optionally --api-domain/--dashboard-domain/--core-engine-source/--operator-source/--install-dir)" ;;
  esac
done

[ -z "\$LICENSE" ] && fail "--license is required -- this is the license key from your WarmHawk purchase email."
[ -z "\$DOMAIN" ] && fail "--domain is required (e.g. --domain yourcompany.com)."
[ -z "\$OWNER_EMAIL" ] && fail "--owner-email is required -- this is the address that receives the dashboard owner's setup link."

API_DOMAIN="\${API_DOMAIN:-api.\$DOMAIN}"
DASHBOARD_DOMAIN="\${DASHBOARD_DOMAIN:-dashboard.\$DOMAIN}"

command -v git >/dev/null 2>&1 || fail "git is not installed -- required to fetch the WarmHawk packages. Install git first."
command -v curl >/dev/null 2>&1 || fail "curl is not installed."

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

CORE_ENV="\$CORE_DIR/.env"
[ -f "\$CORE_ENV" ] || fail "warmhawk-core-engine's install completed but \${CORE_ENV} is missing -- cannot read its OPERATOR_SERVICE_TOKEN."
CORE_SERVICE_TOKEN="\$(grep -m1 '^OPERATOR_SERVICE_TOKEN=' "\$CORE_ENV" | cut -d= -f2-)"
[ -n "\$CORE_SERVICE_TOKEN" ] || fail "Could not read OPERATOR_SERVICE_TOKEN from \${CORE_ENV} after install -- check: cat \${CORE_ENV}"

# --- 2. warmhawk-enterprise-operator (dashboard, license-gated) --------------------------------
OPERATOR_DIR="\$INSTALL_DIR/warmhawk-enterprise-operator"
fetch_source "\$OPERATOR_REPO_SOURCE" "\$OPERATOR_DIR" "warmhawk-enterprise-operator"

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
