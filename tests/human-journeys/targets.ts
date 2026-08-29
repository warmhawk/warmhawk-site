/**
 * Resolves HUMAN_ENV ('local' | 'stage' | 'prod', default 'local') to the base URL
 * tests/human-journeys/*.spec.ts should run against — mirrors jitterflow-core-app's own
 * tests/human-journeys/ convention of a live-deploy target resolved from one env var.
 *
 * "local" resolves to `npm run dev`'s port (4800), not the e2e-docker container's port (4801):
 * this suite needs a running app process with REAL Stripe/Resend secrets wired into its own
 * environment (a real checkout -> real webhook -> real email round trip), which in practice means
 * a developer's `.env.local` + `npm run dev`, not the e2e-docker container (whose env is
 * intentionally just build-time placeholders — see scripts/e2e-docker-up.sh's comment; that
 * container cannot complete a real Stripe webhook round trip at all). Revisit this if the project
 * owner ends up preferring a docker-run-with-real-secrets convention for local human-journey runs
 * instead.
 */
export type HumanEnvLabel = 'local' | 'stage' | 'prod';

const BASE_URLS: Record<HumanEnvLabel, string> = {
  local: 'http://localhost:4800',
  stage: 'https://stage.warmhawk.com',
  prod: 'https://warmhawk.com',
};

function resolveLabel(): HumanEnvLabel {
  const raw = process.env.HUMAN_ENV;
  if (raw === 'stage' || raw === 'prod') return raw;
  return 'local';
}

export const label: HumanEnvLabel = resolveLabel();

export const target = {
  label,
  baseURL: BASE_URLS[label],
};
