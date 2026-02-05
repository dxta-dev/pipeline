import type { Instrumentation } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";

/**
 * Create auto-instrumentations for common libraries.
 */
export function createInstrumentations(): Instrumentation[] {
  return [
    // HTTP/HTTPS auto-instrumentation
    new HttpInstrumentation({
      // Don't trace health check endpoints
      ignoreIncomingPaths: [/^\/health/],
    }),
  ];
}
