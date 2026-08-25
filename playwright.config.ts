import { defineConfig, devices } from '@playwright/test';

// Mirrors the sibling warmhawk-enterprise-operator repo's
// apps/web/playwright.config.ts (same testDir shape, fullyParallel/
// forbidOnly/retries/reporter conventions, baseURL-from-env-with-fallback
// pattern, single chromium project) for consistency across the warmhawk
// repos' Playwright setups.
//
// Unlike that sibling config, this repo's site is already running as a
// built, standalone artifact (a Docker container started separately this
// session, `docker run -d --name warmhawk-site -p 4650:4600 ...` from the
// Dockerfile in this repo) rather than something Playwright should launch
// itself — there is no `webServer` block here on purpose. Start the
// container (or `npm run build && npm run start` for a non-Docker
// equivalent) before running `npm run test:e2e`.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4650',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
