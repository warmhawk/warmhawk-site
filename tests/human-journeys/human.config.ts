import { defineConfig, devices } from '@playwright/test';
import { target } from './targets';

// Loads .env/.env.stage EXCLUSIVELY when HUMAN_ENV=stage — no merge/fallback with
// .env/.env.local or .env/.env.example, and a no-op for local/prod — before workers fork, so
// STRIPE_SECRET_KEY/price IDs/RESEND_API_KEY/LICENSE_SIGNING_PRIVATE_KEY etc. are set for every
// worker regardless of which spec file happens to load first. See scripts/load-env.js's own
// header comment for the full rationale; .env/.env.stage itself is gitignored (real values, filled
// in by hand) — .env/.env.stage.example (committed) documents its shape. Never touches any other
// env file in this repo — deliberately narrower than jitterflow-core-app's own
// scripts/load-env.js, which layers .env/.env.prod + .env/.env.local for a different repo shape.
require('../../scripts/load-env').loadEnv();

// Live-deploy verification suite — mirrors jitterflow-core-app's own tests/human-journeys/
// convention: a real Stripe test-mode subscription + real Resend email round trip against an
// already-running deployment, resolved via HUMAN_ENV (see targets.ts). fullyParallel stays false
// on purpose (this suite creates a real Stripe subscription, so within-file ordering still
// matters), but workers is bumped 1 -> 4 (Human Journey Gate task 1) since this repo only ever
// runs one human-journey spec file at a time today — there is no cross-file real-money race to
// worry about, and 4 gives headroom once a second spec file exists.
//
// retries: 0 — a real checkout isn't safely retryable (a retry would create a second real
// subscription rather than re-running an idempotent check), same reasoning as jitterflow's own
// human-journey convention.
//
// No `webServer` block, same reasoning as tests/playwright.config.ts's own comment: this
// targets an already-deployed URL (see targets.ts), not something Playwright should launch itself.
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: target.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
