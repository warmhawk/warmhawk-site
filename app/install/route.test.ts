import { describe, it, expect } from 'vitest';
import { GET } from './route';

/**
 * Tests app/install/route.ts — the combined installer served at
 * https://warmhawk.com/install (the exact URL lib/email.ts's buildInstallCommand puts in every
 * license email). This route returns a static shell script, not JSON, so these tests assert on
 * response headers and on the script text containing the specific flags/behavior the two product
 * install.sh scripts actually require — not a byte-for-byte snapshot, so the script's prose can
 * evolve without breaking this test on every wording tweak.
 */
describe('GET /install', () => {
  it('serves the script as shell text, never cached', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/x-shellscript; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('parses --license, --domain, and --owner-email', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('--license) LICENSE="$2"; shift 2 ;;');
    expect(script).toContain('--domain) DOMAIN="$2"; shift 2 ;;');
    expect(script).toContain('--owner-email) OWNER_EMAIL="$2"; shift 2 ;;');
  });

  it('requires only --domain — Tier 0 must install with no license at all', async () => {
    const script = await (await GET()).text();
    expect(script).toMatch(/\[ -z "\$DOMAIN" \] && fail/);
    // The 2026-08-30 go-live audit's blocker B4: an unconditional --license guard made the
    // one-liner printed on the homepage hero, the closing CTA, /docs/quickstart and core-engine's
    // README all die instantly on "--license is required". Nothing may reintroduce it.
    expect(script).not.toMatch(/\[ -z "\$LICENSE" \] && fail/);
    expect(script).not.toMatch(/\[ -z "\$OWNER_EMAIL" \] && fail/);
  });

  it('requires --owner-email only when --license is supplied', async () => {
    const script = await (await GET()).text();
    // The operator needs an address to send the owner's setup link to, so the pairing still holds
    // — it is just conditional on actually installing the operator now.
    expect(script).toMatch(/if \[ -n "\$LICENSE" \] && \[ -z "\$OWNER_EMAIL" \]; then/);
    expect(script).toContain('--owner-email is required alongside --license');
  });

  it('exits cleanly after the engine when no license was given, never reaching the operator', async () => {
    const script = await (await GET()).text();
    const tier0Exit = script.indexOf('exit 0');
    const operatorIdx = script.indexOf('--license "$LICENSE"');
    expect(tier0Exit).toBeGreaterThan(-1);
    expect(operatorIdx).toBeGreaterThan(-1);
    // The early exit has to come first, or the operator block runs licenseless and fails.
    expect(tier0Exit).toBeLessThan(operatorIdx);
    // And it has to tell a free-tier user where to go next, rather than just stopping.
    expect(script).toContain('https://warmhawk.com/docs/quickstart');
    expect(script).toContain('https://warmhawk.com/checkout');
  });

  it('documents both the Tier 0 and licensed invocations in its usage header', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('Tier 0');
    // --license takes the long signed token; teaching the short whk_live_ identifier here is what
    // /docs/license-activation had to be corrected for.
    expect(script).not.toMatch(/--license whk_live_/);
  });

  it('splits --domain into api.<domain> and dashboard.<domain> by default', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('API_DOMAIN="${API_DOMAIN:-api.$DOMAIN}"');
    expect(script).toContain('DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-dashboard.$DOMAIN}"');
  });

  it('runs core-engine install.sh (no license) before the operator (license-gated)', async () => {
    const script = await (await GET()).text();
    const coreIdx = script.indexOf('./scripts/install.sh --domain "$API_DOMAIN"');
    const operatorIdx = script.indexOf('--license "$LICENSE"');
    expect(coreIdx).toBeGreaterThan(-1);
    expect(operatorIdx).toBeGreaterThan(-1);
    expect(coreIdx).toBeLessThan(operatorIdx);
  });

  it('reads the OPERATOR_SERVICE_TOKEN core-engine generates and passes it straight through', async () => {
    const script = await (await GET()).text();
    expect(script).toContain(`grep -m1 '^OPERATOR_SERVICE_TOKEN=' "$CORE_ENV"`);
    expect(script).toContain('--core-engine-service-token "$CORE_SERVICE_TOKEN"');
  });

  it('passes --core-engine-url with no /api suffix (core-engine only proxies /v1, /health, /status)', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('--core-engine-url "https://${API_DOMAIN}"');
  });

  it('passes --owner-email through to the operator install (LicensePayload carries no email)', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('--owner-email "$OWNER_EMAIL"');
  });

  it('supports a core-engine-source override via env var, defaulting to the real public GitHub repo', async () => {
    const script = await (await GET()).text();
    expect(script).toContain(
      'CORE_REPO_SOURCE="${WARMHAWK_CORE_REPO_URL:-https://github.com/warmhawk/warmhawk-core-engine.git}"',
    );
    expect(script).toContain('--core-engine-source) CORE_REPO_SOURCE="$2"; shift 2 ;;');
  });

  it('fetches the operator deploy-tooling tarball instead of cloning warmhawk-enterprise-operator — that repo is private forever', async () => {
    const script = await (await GET()).text();
    // No git clone of the operator repo anywhere in this script -- only core-engine's is a real
    // `fetch_source` git-or-local-path call.
    expect(script).not.toContain('WARMHAWK_OPERATOR_REPO_URL');
    expect(script).not.toContain('OPERATOR_REPO_SOURCE');
    expect(script).not.toContain('--operator-source');
    expect(script).toContain(
      'OPERATOR_DEPLOY_TOOLING_URL="${OPERATOR_DEPLOY_TOOLING_URL:-https://warmhawk.com/api/operator-deploy-tooling}"',
    );
    expect(script).toContain(
      '--operator-deploy-tooling-url) OPERATOR_DEPLOY_TOOLING_URL="$2"; shift 2 ;;',
    );
    expect(script).toContain(
      'curl -fsSL "$OPERATOR_DEPLOY_TOOLING_URL" | tar -xz -C "$OPERATOR_DIR"',
    );
  });

  it('does not print its own setup-link message, letting the operator install.sh output flow through', async () => {
    const script = await (await GET()).text();
    expect(script).not.toContain('accept-invite?token=');
  });
});
