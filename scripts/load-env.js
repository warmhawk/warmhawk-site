// Env loader for tests/human-journeys/*, deliberately narrower than jitterflow-core-app's own
// scripts/load-env.js (which layers .env/.env.prod then .env/.env.local on top — a merge chain
// that repo's stage/prod split doesn't need the same way). This repo's human-journey stage suite
// must load .env/.env.stage EXCLUSIVELY when HUMAN_ENV=stage:
//  - No merging with, or falling back to, .env/.env.local, .env/.env.prod, or .env/.env.example —
//    exactly one file, exactly one dotenv.config() call.
//  - Only fires for HUMAN_ENV=stage. `local` (the default) and `prod` load nothing here — same
//    as before this file existed, i.e. whatever's already in the shell/CI environment.
//  - dotenv's default (non-`override`) behavior means an already-set process.env var always wins,
//    so a Woodpecker `from_secret` injected before this runs still takes precedence — this file is
//    for local/dev parity only, never a substitute for CI's own secret injection.
//  - Never writes to .env/.env.stage — read-only via dotenv, same as any other consumer. That file
//    is gitignored and carries real values filled in by hand; only the committed
//    .env/.env.stage.example documents its shape (placeholders only).
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  if (process.env.HUMAN_ENV !== 'stage') {
    return;
  }
  require('dotenv').config({ path: path.join(ROOT, '.env/.env.stage') });
}

module.exports = { loadEnv };
