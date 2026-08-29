import { defineConfig, devices } from '@playwright/test';
import { target } from './targets';

// Live-deploy verification suite — mirrors jitterflow-core-app's own tests/human-journeys/
// convention: a real Stripe test-mode subscription + real Resend email round trip against an
// already-running deployment, resolved via HUMAN_ENV (see targets.ts). Serialized on purpose
// (fullyParallel: false, workers: 1) — this suite creates a real Stripe subscription, so there's
// no upside to concurrency here, unlike tests/playwright.config.ts's e2e suite.
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
  workers: 1,
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
