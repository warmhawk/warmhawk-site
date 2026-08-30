import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards a defect found by a full link crawl of the production build on 2026-08-30: the site
 * linked `github.com/warmhawk/warmhawk-enterprise-operator` from the footer — so every one of its
 * 41 pages carried a link that served GitHub's 404 page — plus two CHANGELOG.md links on
 * /docs/reference/faq-and-changelog. All three targets are repos an anonymous visitor cannot open.
 *
 * Repo visibility is the thing to keep straight here, and it is not the same for all three:
 *
 * | Repo                          | Visibility                                  |
 * |-------------------------------|---------------------------------------------|
 * | warmhawk-core-engine          | open source (BSL 1.1), public at go-live    |
 * | warmhawk-enterprise-operator  | proprietary — private permanently           |
 * | warmhawk-site                 | proprietary — private permanently           |
 *
 * So core-engine links are fine but must stay gated behind `coreEngineRepoPublic` until the repo
 * actually flips; the other two must never be linked at all, under any flag. A reader who follows
 * one lands on a 404 that reads, to a buyer running diligence, like the product isn't real.
 *
 * Scanned as source text rather than rendered markup because these URLs are spread across page
 * components, config, and metadata — a render-based test would have to mount all 41 pages to cover
 * the same ground, and would still miss any page added tomorrow.
 */

const REPO_ROOT = path.resolve(__dirname, '..');

const SCANNED_DIRS = ['components', 'lib', 'app'];

/**
 * Excluded because they legitimately contain these URLs and never render one as a link:
 *
 *  - `app/install` emits a bash installer whose `git clone` source for the private operator repo is
 *    correct and necessary (it clones with the customer's own credentials).
 *  - `app/api` is JSON/redirect route handlers, not markup.
 *
 * Everything else under `app/` is scanned wholesale rather than by an allowlist of subtrees — the
 * first version of this test listed subtrees by hand and promptly missed `app/status`, which is
 * exactly the failure mode an allowlist invites when someone adds a page next week.
 */
const EXCLUDED = [path.join('app', 'install'), path.join('app', 'api')];

const PERMANENTLY_PRIVATE = ['warmhawk-enterprise-operator', 'warmhawk-site'];

function sourceFiles(dir: string): string[] {
  if (EXCLUDED.includes(dir)) return [];
  const abs = path.join(REPO_ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = path.join(abs, entry);
    if (statSync(full).isDirectory()) return sourceFiles(path.join(dir, entry));
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry)) return [];
    return [path.join(dir, entry)];
  });
}

/**
 * Strips `//` and block comments so the several accurate prose references to these repo names in
 * header comments don't register as links. Deliberately crude — it only has to be good enough to
 * drop comment text, and over-stripping would at worst cause a false pass on a line that a human
 * reading the diff would still catch.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const files = SCANNED_DIRS.flatMap(sourceFiles);

describe('outbound GitHub links', () => {
  it('scans a non-trivial number of source files (guards the walker itself)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(PERMANENTLY_PRIVATE)('never links github.com/warmhawk/%s', (repo) => {
    const offenders = files.filter((file) => {
      const source = withoutComments(readFileSync(path.join(REPO_ROOT, file), 'utf8'));
      return source.includes(`github.com/warmhawk/${repo}`);
    });
    expect(offenders).toEqual([]);
  });

  it('only links core-engine on github.com when CORE_ENGINE_REPO_PUBLIC says it is public', () => {
    // Every core-engine github.com URL must be built from `coreEngineRepoUrl`, which is only ever
    // consumed behind `coreEngineRepoPublic` — so no file outside siteConfig.ts should hardcode it.
    const offenders = files.filter((file) => {
      if (file === path.join('lib', 'siteConfig.ts')) return false;
      const source = withoutComments(readFileSync(path.join(REPO_ROOT, file), 'utf8'));
      return source.includes('github.com/warmhawk/warmhawk-core-engine');
    });
    expect(offenders).toEqual([]);
  });
});
