/**
 * OpenTelemetry bootstrap for the Blast Radius worker.
 *
 * IMPORTANT: This file MUST be imported at the very top of worker.ts
 * (before any other imports) so the SDK instruments all HTTP/fetch calls.
 *
 * If OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is not set, telemetry is a no-op
 * (so local dev works without a Grafana account).
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { trace } from "@opentelemetry/api";
import type { Tracer } from "@opentelemetry/api";

const ENDPOINT = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
const AUTH_HEADER = process.env.OTEL_AUTH_HEADER; // "Basic <base64(instanceId:apiToken)>"

let sdk: NodeSDK | null = null;

if (ENDPOINT) {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "blast-radius-worker",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    traceExporter: new OTLPTraceExporter({
      url: ENDPOINT,
      headers: AUTH_HEADER ? { Authorization: AUTH_HEADER } : {},
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy ones for cleaner traces
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`📡 OpenTelemetry SDK started → ${ENDPOINT}`);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk?.shutdown().catch(console.error);
  });
} else {
  console.log("📡 OpenTelemetry: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT not set — running without tracing");
}

/**
 * Get the tracer for the worker. Returns a no-op tracer if OTel is not configured.
 */
export function getTracer(): Tracer {
  return trace.getTracer("blast-radius-worker", "0.1.0");
}

export default sdk;
