#!/usr/bin/env node
/**
 * Mechanical version of the "diff lib/tierConfig.ts against warmhawk-core-engine's
 * packages/tier-config/src/constants.ts by hand" rule documented at the top of tierConfig.ts.
 *
 * A plain Node ESM script has no TS loader in this repo (same constraint documented on
 * scripts/submit-indexnow.mjs), and warmhawk-site has no runtime dependency on either product
 * repo (Repo Architecture — this is a separate, static-leaning repo), so this can't `import`
 * constants.ts directly even when the sibling repo is checked out locally. Instead it reads both
 * files as text and regex-extracts the handful of booleans/strings that actually drive Tier 2's
 * marketing claims, then asserts they still say what the site says.
 *
 * NOT wired into CI — warmhawk-core-engine isn't checked out there. Run by hand before a release
 * (`npm run check:tier-sync`), or point SIBLING_CORE_ENGINE at wherever it's cloned:
 *   SIBLING_CORE_ENGINE=/path/to/warmhawk-core-engine npm run check:tier-sync
 * Exits 0 with a warning (not a failure) if the sibling repo isn't found — this is an advisory
 * check for whoever's running it locally, not a CI gate.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE_ENGINE_ROOT =
  process.env.SIBLING_CORE_ENGINE || path.resolve(SITE_ROOT, '..', 'warmhawk-core-engine');
const CONSTANTS_PATH = path.join(CORE_ENGINE_ROOT, 'packages/tier-config/src/constants.ts');
const TIER_CONFIG_PATH = path.join(SITE_ROOT, 'lib/tierConfig.ts');

function extractTierBlock(source, tierKey) {
  // TIER_FEATURES entries are `tier_N: { ... },` at one level of indent — grab everything up to
  // the matching top-level closing brace by tracking depth rather than a lazy regex, since the
  // block itself contains nested `{ ... }` (supportSla).
  const start = source.indexOf(`${tierKey}: {`);
  if (start === -1) throw new Error(`Could not find "${tierKey}: {" in ${CONSTANTS_PATH}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  const blockStart = i;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(blockStart, i + 1);
    }
  }
  throw new Error(`Unterminated "${tierKey}" block in ${CONSTANTS_PATH}`);
}

function extractBool(block, field) {
  const m = block.match(new RegExp(`${field}:\\s*(true|false)`));
  if (!m) throw new Error(`Could not find boolean field "${field}"`);
  return m[1] === 'true';
}

function extractString(block, field) {
  const m = block.match(new RegExp(`${field}:\\s*'([^']*)'`));
  return m ? m[1] : null;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

if (!existsSync(CONSTANTS_PATH)) {
  console.warn(
    `warmhawk-core-engine not found at ${CORE_ENGINE_ROOT} — skipping (set SIBLING_CORE_ENGINE to point at it).`,
  );
  process.exit(0);
}

const constants = readFileSync(CONSTANTS_PATH, 'utf8');
const siteConfig = readFileSync(TIER_CONFIG_PATH, 'utf8');

const tier1 = extractTierBlock(constants, 'tier_1');
const tier2 = extractTierBlock(constants, 'tier_2');

// 1. Tier 2 must still be the only tier with the isTier2 gate — that's the whole premise of the
//    site's "Tier 2 exclusive" card group (lib/tierConfig.ts's `exclusiveFeatures`).
if (extractBool(tier2, 'isTier2') && !extractBool(tier1, 'isTier2')) {
  ok('isTier2 is still true for tier_2 only — the "Tier 2 exclusive" group is still exclusive.');
} else {
  fail(
    "isTier2 no longer differentiates tier_1/tier_2 the way the pricing card assumes — check lib/tierConfig.ts's exclusiveFeatures group against constants.ts.",
  );
}

// 2. Audit log must still be unbuilt for Tier 2, matching the card's "(planned,
//    procurement-driven)" wording — if this ever flips true, that copy is stale (it should say
//    shipped, not planned).
if (extractBool(tier2, 'auditLog') === false) {
  ok(
    'auditLog is still false for tier_2 — the pricing card\'s "planned" wording is still accurate.',
  );
} else {
  fail(
    'auditLog is now true for tier_2 — lib/tierConfig.ts\'s "Audit log (planned, procurement-driven)" bullet is stale and should say it shipped.',
  );
}

// 3. Support SLA wording — the site's Tier 1 bullet says "support@warmhawk.com — 1 business day /
//    4h critical", and its Tier 2 bullet says "Direct founder line, same-business-day response".
const tier1FirstResponse = extractString(tier1, 'firstResponse');
const tier1Channel = extractString(tier1, 'channel');
const tier2FirstResponse = extractString(tier2, 'firstResponse');

if (tier1Channel?.includes('support@warmhawk.com') && tier1FirstResponse === '1 business day') {
  ok('Tier 1 support SLA (support@warmhawk.com, 1 business day) still matches the pricing card.');
} else {
  fail(
    `Tier 1 support SLA changed (channel="${tier1Channel}", firstResponse="${tier1FirstResponse}") — update lib/tierConfig.ts's Tier 1 bullet to match.`,
  );
}

if (tier2FirstResponse?.toLowerCase().includes('same business day')) {
  ok(
    'Tier 2 support SLA (same business day) still matches the pricing card\'s "same-business-day response".',
  );
} else {
  fail(
    `Tier 2 support SLA changed (firstResponse="${tier2FirstResponse}") — update lib/tierConfig.ts's Tier 2 bullet to match.`,
  );
}

// 4. The exact four isTier2-gated UI surfaces the site's exclusiveFeatures array names —
//    BadgeEmbedPanel, the certificate PDF button, the compliance-report PDF button, and
//    LookalikeCandidatesPanel. constants.ts doesn't enumerate these individually (it's one
//    boolean flag), so this just confirms the site still lists exactly the four this script's own
//    header comment (and tierConfig.ts's ExclusiveFeature doc comment) describes — a reminder to
//    re-grep the operator app if a fifth surface gets added there without a matching site update.
const exclusiveLabels = [...siteConfig.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
const expectedLabels = [
  'Trust badge embed',
  'Domain certificate PDF',
  'Compliance report PDF',
  'Lookalike-domain monitoring',
];
if (expectedLabels.every((label) => exclusiveLabels.includes(label))) {
  ok('All four known isTier2-gated UI surfaces are still listed in lib/tierConfig.ts.');
} else {
  fail(
    `lib/tierConfig.ts's exclusiveFeatures no longer lists all four known isTier2 surfaces (found: ${exclusiveLabels.join(', ')}) — if a surface was added or removed in warmhawk-enterprise-operator, update both this script and tierConfig.ts.`,
  );
}

if (process.exitCode === 1) {
  console.error('\ncheck-tier-sync found drift — see above.');
} else {
  console.log('\ncheck-tier-sync: no drift found.');
}
