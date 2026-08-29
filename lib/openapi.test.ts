import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { docsSections } from './docsNav';

/**
 * public/openapi.json (served at https://warmhawk.com/openapi.json) is a
 * hand-authored, static machine-readable description of
 * warmhawk-core-engine's real /v1 API and its one public endpoint — GEO
 * baseline, for coding agents and API clients, matching sibling product
 * Jitterflow's own `/openapi.json`. It's static rather than generated
 * (unlike llms.txt) because the API it describes lives in a different
 * repo, not in any data this repo already renders from — so these tests
 * only confirm the file is valid and internally consistent, not that it's
 * drift-proof against warmhawk-core-engine's actual route table.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.join(__dirname, '..', 'public', 'openapi.json');
const raw = fs.readFileSync(openapiPath, 'utf-8');

describe('public/openapi.json', () => {
  it('is valid JSON declaring OpenAPI 3.0.3', () => {
    const spec = JSON.parse(raw);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info?.title).toBe('WarmHawk API');
  });

  it('documents every /v1 route named in the auth-and-mailboxes, leads-and-campaigns, and queue-domains-and-webhooks doc pages', () => {
    const spec = JSON.parse(raw);
    const paths = Object.keys(spec.paths);

    const expectedPaths = [
      '/auth/login',
      '/mailboxes',
      '/mailboxes/{id}',
      '/oauth/{provider}/authorize',
      '/oauth/{provider}/callback',
      '/leads',
      '/leads/webhook',
      '/leads/import',
      '/leads/{id}/suppress',
      '/leads/erase',
      '/leads/{id}',
      '/campaigns',
      '/campaigns/{id}',
      '/campaigns/{id}/launch',
      '/campaigns/{id}/pause',
      '/queue/status',
      '/queue/pause',
      '/domains',
      '/domains/{id}',
      '/domains/{domain}/check',
      '/domains/{id}/placement-sample',
    ];

    for (const p of expectedPaths) {
      expect(paths, `expected openapi.json to document ${p}`).toContain(p);
    }
  });

  it('marks POST /auth/login, both /oauth/* routes, and POST /leads/webhook as not requiring bearer auth', () => {
    const spec = JSON.parse(raw);
    expect(spec.paths['/auth/login'].post.security).toEqual([]);
    expect(spec.paths['/oauth/{provider}/authorize'].get.security).toEqual([]);
    expect(spec.paths['/oauth/{provider}/callback'].get.security).toEqual([]);
    expect(spec.paths['/leads/webhook'].post.security).toEqual([]);
  });

  it('carries a top-level bearerAuth security requirement for every other route', () => {
    const spec = JSON.parse(raw);
    expect(spec.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it("documents the free public domain-check tool endpoint, matching DomainCheckTool.tsx's response contract", () => {
    const spec = JSON.parse(raw);
    const schema =
      spec.paths['/public/domain-check'].get.responses['200'].content['application/json'].schema;
    expect(schema.properties.spf.enum).toEqual(['PASS', 'FAIL']);
    expect(schema.properties.dkim.enum).toEqual(['PASS', 'FAIL']);
    expect(schema.properties.dmarc.enum).toEqual(['PASS', 'FAIL']);
    expect(schema.properties.listUnsubscribeCheck.type).toBe('string');
  });

  it('never claims outbound webhooks exist, matching the honest "Planned, not built" framing in the docs', () => {
    const spec = JSON.parse(raw);
    const paths = Object.keys(spec.paths);
    expect(paths.some((p) => /webhooks?(?!\/)/.test(p) && p !== '/leads/webhook')).toBe(false);
    expect(spec.info.description).toContain('planned, not implemented');
  });

  it("is at least referenced by the site's own docs navigation data (api-reference section exists)", () => {
    const apiRefSection = docsSections.find((s) => s.label === 'API reference');
    expect(apiRefSection).toBeDefined();
    expect(apiRefSection!.links.length).toBeGreaterThan(0);
  });
});
