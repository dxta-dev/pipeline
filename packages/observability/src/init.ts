import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  createLogExporter,
  createMetricReader,
  createTraceExporter,
} from "./exporters";
import { createInstrumentations } from "./instrumentations";
import { createResource } from "./resource";

export interface ObservabilityConfig {
  /** Service name for identification */
  serviceName: string;
  /** Service version (default: 1.0.0) */
  serviceVersion?: string;
  /** OTLP endpoint URL (default: http://otel.railway.internal:4317) */
  otlpEndpoint?: string;
  /** Log level for OTEL diagnostics */
  logLevel?: "debug" | "info" | "warn" | "error";
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with OTLP exporters.
 * Must be called before any other imports that need instrumentation.
 */
export function initObservability(config: ObservabilityConfig): void {
  if (sdk) {
    console.warn("Observability SDK already initialized");
    return;
  }

  // Configure diagnostic logging
  const diagLevel = config.logLevel || "info";
  const logLevelMap: Record<string, DiagLogLevel> = {
    debug: DiagLogLevel.DEBUG,
    info: DiagLogLevel.INFO,
    warn: DiagLogLevel.WARN,
    error: DiagLogLevel.ERROR,
  };
  diag.setLogger(
    new DiagConsoleLogger(),
    logLevelMap[diagLevel] || DiagLogLevel.INFO,
  );

  const otlpEndpoint =
    config.otlpEndpoint || "http://otel.railway.internal:4317";

  sdk = new NodeSDK({
    resource: createResource(config.serviceName, config.serviceVersion),
    traceExporter: createTraceExporter(otlpEndpoint),
    logRecordExporter: createLogExporter(otlpEndpoint),
    metricReader: createMetricReader(otlpEndpoint),
    instrumentations: createInstrumentations(),
  });

  sdk.start();

  console.log(`[observability] SDK initialized for ${config.serviceName}`);
  console.log(`[observability] OTLP endpoint: ${otlpEndpoint}`);

  // Graceful shutdown
  process.on("SIGTERM", shutdownObservability);
  process.on("SIGINT", shutdownObservability);
}

/**
 * Shutdown the SDK and flush pending telemetry.
 */
export async function shutdownObservability(): Promise<void> {
  if (!sdk) return;

  console.log("[observability] Shutting down SDK...");

  try {
    await sdk.shutdown();
    console.log("[observability] SDK shutdown complete");
  } catch (err) {
    console.error("[observability] Error during shutdown:", err);
  } finally {
    sdk = null;
  }
}

/**
 * Check if SDK is initialized.
 */
export function isObservabilityInitialized(): boolean {
  return sdk !== null;
}
