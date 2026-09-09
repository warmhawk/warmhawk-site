// Next.js's own hook for exactly this purpose (stable since 13.4, no config flag needed on
// 15.5.24) — called once per server instance, before any route handler runs. Adapted from
// the same tracing setup used elsewhere in this product family (same org-wide SigNoz collector,
// same "OTEL_EXPORTER_OTLP_ENDPOINT unset = SDK never loads, zero overhead" contract), rewritten as
// instrumentation.ts because this is a Next.js app: there's no separate entry-point file to
// `node -r` a bootstrap script ahead of, so register() is the framework's equivalent hook.
//
// NEXT_RUNTIME guard: register() also fires for the edge runtime, which can't run the Node OTEL
// SDK at all (this app has no edge middleware today, but the guard is the documented-correct
// pattern regardless, not a response to a real collision).
// 2026-09-09 incident: LICENSE_SIGNING_PRIVATE_KEY changed in production with nothing to notice the
// swap, silently invalidating every already-issued license's signature (relay-invite and
// relay-password-reset both 401'd for every customer, folded into the same generic response either
// route already gives a caller). Checked only on the real production domain — stage intentionally
// runs its own, different signing key (see .env.stage's own comment), so this must never fire there
// or in local/CI dev, both of which commonly have no LICENSE_SIGNING_PRIVATE_KEY configured at all.
//
// WARMHAWK_E2E_DOCKER: scripts/e2e-docker-up.sh builds a throwaway container from
// .env/.env.local for `npm run test:e2e:docker`, which deliberately sets NEXT_PUBLIC_SITE_URL to
// the real prod value to exercise prod-like URLs — the only signal that container is not actually
// production is this flag, which that script alone injects via `docker run -e`. Discovered
// 2026-09-09 when this guard's first deploy failed the e2e-docker CI job outright.
async function assertLicenseSigningKeyUnchanged(): Promise<void> {
  if (process.env.WARMHAWK_E2E_DOCKER) return;
  if (process.env.NEXT_PUBLIC_SITE_URL !== 'https://warmhawk.com') return;

  const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) return; // Existing routes already degrade to a clear 503 for this case.

  const { checkLicenseSigningKeyFingerprint } = await import('./lib/license');
  const result = checkLicenseSigningKeyFingerprint(privateKeyPem);
  if (result.ok) return;

  // Thrown, not logged: a mismatch here means every previously-issued license is about to start
  // silently failing verification the moment this instance takes traffic. Refusing to boot is the
  // whole point — see EXPECTED_LICENSE_PUBLIC_KEY_FINGERPRINT's doc comment in lib/license.ts for
  // the deliberate-rotation update path.
  throw new Error(
    `LICENSE_SIGNING_PRIVATE_KEY does not derive the pinned production public key — refusing to ` +
      `start. Expected fingerprint ${result.expectedFingerprint}, got ${result.actualFingerprint}. ` +
      `If this is a real, deliberate key rotation, update EXPECTED_LICENSE_PUBLIC_KEY_FINGERPRINT in ` +
      `lib/license.ts in the same change that rotates the secret.`,
  );
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  await assertLicenseSigningKeyUnchanged();

  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  // webpackIgnore: serverExternalPackages only stops webpack from bundling the four packages named
  // there — it does nothing for what THOSE packages themselves pull in (grpc-js's OTLP-over-gRPC
  // path, the winston instrumentation, the GCP resource detector's fetch stack), and webpack still
  // descends into those transitive files looking for Node built-ins it can't bundle. Marking the
  // import itself ignored is the standard, documented fix: webpack leaves the whole call alone and
  // Node's own runtime `import()` resolves it, natively, exactly like every other require() this
  // SDK does at runtime.
  const { diag, DiagConsoleLogger, DiagLogLevel } = await import(
    /* webpackIgnore: true */ '@opentelemetry/api'
  );
  const { NodeSDK } = await import(/* webpackIgnore: true */ '@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import(
    /* webpackIgnore: true */ '@opentelemetry/auto-instrumentations-node'
  );
  const { OTLPTraceExporter } = await import(
    /* webpackIgnore: true */ '@opentelemetry/exporter-trace-otlp-http'
  );

  // Silent by default (fire-and-forget export errors go nowhere without this) — WARN surfaces a
  // broken endpoint instead of just "no traces show up" with zero clue why. Same convention used
  // elsewhere in this product family.
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'warmhawk-site',
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Same exclusion made elsewhere in this product family and for the same reason: every
        // dist/*.js require and every log write shows up as a span otherwise — noisy, low-signal.
        // http/fetch/dns stay on, which is what actually matters for a Next.js app (route handlers,
        // the Stripe SDK's own outbound calls, the domain-check tool's fetch to core-engine's
        // public API).
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      sdk.shutdown().catch((err) => console.error('[otel] shutdown error:', err));
    });
  }

  console.log(
    `[otel] tracing enabled — service=${process.env.OTEL_SERVICE_NAME || 'warmhawk-site'} endpoint=${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`,
  );
}
