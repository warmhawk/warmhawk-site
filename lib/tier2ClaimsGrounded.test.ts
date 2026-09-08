import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards a defect found by a code audit on 2026-09-08: five separate pages and one FAQ file each
 * independently claimed Tier 2 (Enterprise DFY) includes "white-glove migration" or that its
 * founder "handles DNS, dedicated IPs, and migration" — none of it backed by real code in either
 * product repo. `install.sh`'s cert flags are identical at every tier, CSV/webhook lead import is
 * identical at every tier, and no tier operates managed DNS or dedicated-IP infrastructure. The
 * one real, code-grounded Tier 2 deployment difference is *who runs the install* — the founder,
 * once, for a one-time fee — and the copy across the site now says exactly that.
 *
 * Same false-claim class turned up independently in six files (`app/compare/pricing/page.tsx` ×4
 * paragraphs, `lib/faqContent.ts` ×2, and one FAQ entry each in `app/vs/inframail`,
 * `app/vs/woodpecker`, `app/vs/lemlist`) because there was no single source of truth for this
 * claim and no test catching drift — this test is that catch, scanning every source file rather
 * than pinning the six known offenders, so a seventh instance added next month fails the same way.
 *
 * Scanned as source text, following the same walker as `privateRepoLinks.test.ts` — a render-based
 * test would have to mount every page (and every FAQ/JSON-LD string never renders as visible DOM
 * text in the first place) to cover the same ground.
 */

const REPO_ROOT = path.resolve(__dirname, '..');

const SCANNED_DIRS = ['components', 'lib', 'app'];

const EXCLUDED = [path.join('app', 'install'), path.join('app', 'api')];

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

const files = SCANNED_DIRS.flatMap(sourceFiles);

/**
 * Each pattern is specific to the false claim, not to the general concept — e.g. "dedicated IP" on
 * its own is fine and stays in the site's competitor-comparison copy (WarmHawk explicitly does
 * *not* offer one, and says so); it's only false once it's asserted as something Tier 2 does.
 */
const BANNED_PATTERNS: RegExp[] = [
  /white-glove/i,
  /DNS,\s*dedicated IPs?/i,
  /handle[s]? DNS/i,
  /deploy(ed|ing)? and migrat/i,
  /DNS configuration/i,
  /dedicated IP setup/i,
];

describe('Tier 2 pricing/comparison copy stays grounded in real code', () => {
  it('scans a non-trivial number of source files (guards the walker itself)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(BANNED_PATTERNS)('never claims Tier 2 provides managed DNS/IP/migration service (%s)', (pattern) => {
    const offenders = files.filter((file) =>
      pattern.test(readFileSync(path.join(REPO_ROOT, file), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
