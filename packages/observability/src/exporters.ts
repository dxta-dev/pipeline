import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

/**
 * Create OTLP gRPC trace exporter.
 */
export function createTraceExporter(endpoint: string): OTLPTraceExporter {
  return new OTLPTraceExporter({
    url: endpoint,
  });
}

/**
 * Create OTLP gRPC log exporter.
 */
export function createLogExporter(endpoint: string): OTLPLogExporter {
  return new OTLPLogExporter({
    url: endpoint,
  });
}

/**
 * Create metric reader with OTLP gRPC exporter.
 */
export function createMetricReader(
  endpoint: string,
): PeriodicExportingMetricReader {
  return new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: endpoint,
    }),
    exportIntervalMillis: 60000, // Export every minute
  });
}
