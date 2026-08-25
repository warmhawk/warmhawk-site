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

  it('parses --license, --domain, and --owner-email, and requires all three', async () => {
    const script = await (await GET()).text();
    expect(script).toContain('--license) LICENSE="$2"; shift 2 ;;');
    expect(script).toContain('--domain) DOMAIN="$2"; shift 2 ;;');
    expect(script).toContain('--owner-email) OWNER_EMAIL="$2"; shift 2 ;;');
    expect(script).toMatch(/\[ -z "\$LICENSE" \] && fail/);
    expect(script).toMatch(/\[ -z "\$DOMAIN" \] && fail/);
    expect(script).toMatch(/\[ -z "\$OWNER_EMAIL" \] && fail/);
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

  it('supports repo-source overrides via env vars, defaulting to the real public GitHub repos', async () => {
    const script = await (await GET()).text();
    expect(script).toContain(
      'CORE_REPO_SOURCE="${WARMHAWK_CORE_REPO_URL:-https://github.com/warmhawk/warmhawk-core-engine.git}"',
    );
    expect(script).toContain(
      'OPERATOR_REPO_SOURCE="${WARMHAWK_OPERATOR_REPO_URL:-https://github.com/warmhawk/warmhawk-enterprise-operator.git}"',
    );
    expect(script).toContain('--core-engine-source) CORE_REPO_SOURCE="$2"; shift 2 ;;');
    expect(script).toContain('--operator-source) OPERATOR_REPO_SOURCE="$2"; shift 2 ;;');
  });

  it('does not print its own setup-link message, letting the operator install.sh output flow through', async () => {
    const script = await (await GET()).text();
    expect(script).not.toContain('accept-invite?token=');
  });
});
