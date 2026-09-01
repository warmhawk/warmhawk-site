// Next.js's own hook for exactly this purpose (stable since 13.4, no config flag needed on
// 15.5.24) — called once per server instance, before any route handler runs. Adapted from
// jitterflow-core-app's ops/otel/tracing.js (same org-wide SigNoz collector, same
// "OTEL_EXPORTER_OTLP_ENDPOINT unset = SDK never loads, zero overhead" contract), rewritten as
// instrumentation.ts because this is a Next.js app: there's no separate entry-point file to
// `node -r` a bootstrap script ahead of, so register() is the framework's equivalent hook.
//
// NEXT_RUNTIME guard: register() also fires for the edge runtime, which can't run the Node OTEL
// SDK at all (this app has no edge middleware today, but the guard is the documented-correct
// pattern regardless, not a response to a real collision).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  const { diag, DiagConsoleLogger, DiagLogLevel } = await import('@opentelemetry/api');
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

  // Silent by default (fire-and-forget export errors go nowhere without this) — WARN surfaces a
  // broken endpoint instead of just "no traces show up" with zero clue why. Same as jitterflow.
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'warmhawk-site',
    traceExporter: new OTLPTraceExporter({ url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Same exclusion jitterflow makes and for the same reason: every dist/*.js require and
        // every log write shows up as a span otherwise — noisy, low-signal. http/fetch/dns stay on,
        // which is what actually matters for a Next.js app (route handlers, the Stripe SDK's own
        // outbound calls, the domain-check tool's fetch to core-engine's public API).
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
