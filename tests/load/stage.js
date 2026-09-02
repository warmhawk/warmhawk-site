import http from 'k6/http';
import { check, sleep } from 'k6';

// Read-only marketing/docs page load test — added for CI-tier parity with an established k6 load
// test convention, per an explicit product-owner decision, despite this being a low-backend-logic
// marketing site. Self-contained (no `.k6-lib` import — this repo has no shared k6 library file).
//
// Deliberately excludes /api/checkout/session: creating real Stripe Checkout Sessions under load
// would spam the Stripe test dashboard with dozens of throwaway sessions per run for no
// code-under-test benefit (that route's real behavior is already covered by
// app/api/checkout/session/route.integration.test.ts). This tier only exercises the app's own
// static/SSR page rendering.
//
// K6_BASE_URL, the conventional env var name for this kind of k6 script — defaults to the
// e2e-docker container's mapped port shape (see scripts/e2e-docker-up.sh) so this can run against a
// locally-built container with zero extra config.
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:4600';

const ROUTES = ['/', '/docs', '/docs/introduction', '/checkout', '/compare/pricing'];

// Modest profile appropriate for a marketing site — a smoke-level load check, not a stress test:
// ramp to 10 VUs over 30s, hold for 90s, ramp back down.
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '90s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Static/SSR marketing pages with no per-request data dependency (see next.config.mjs's
    // header comment) should be fast even under this modest load.
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function marketingPageLoadTest() {
  const path = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const res = http.get(`${BASE_URL}${path}`);
  check(res, {
    [`${path} returns 200`]: (r) => r.status === 200,
  });
  sleep(1);
}
