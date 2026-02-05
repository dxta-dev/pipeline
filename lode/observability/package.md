# Observability Package

Shared OpenTelemetry SDK for all Dxta applications. Provides distributed tracing,
structured logging, and custom metrics export to Railway's internal collector.

## Quick Start

```typescript
// MUST be first import - before any other imports!
import { initObservability } from "@dxta/observability";

initObservability({
  serviceName: "@dxta/worker-extract",
  serviceVersion: "1.0.0",
});

// Now import everything else...
import { otherStuff } from "./other";
```

Log startup events via OTEL so they are exported as log records.

```typescript
import { logInfo } from "@dxta/observability";

const env = getEnv();

logInfo("Starting @dxta/worker-extract...");
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | `string` | **required** | Service identifier |
| `serviceVersion` | `string` | `"1.0.0"` | Service version |
| `otlpEndpoint` | `string` | `"http://otel.railway.internal:4317"` | OTLP gRPC endpoint |
| `logLevel` | `"debug"\|"info"\|"warn"\|"error"` | `"info"` | OTEL diag log level |

## Signals

### Traces

- Auto-instrumented HTTP requests
- Manual spans via `traceJob()`
- Always-on sampling
- Exported via OTLP gRPC

### Logs

Structured logs exported via OTLP. Correlated with traces via trace IDs.

### Metrics

Custom counters and histograms:

- `jobs.executed` - Total jobs executed (labels: `job_type`, `status`)
- `jobs.failed` - Total jobs failed (labels: `job_type`)
- `job.duration` - Job execution duration in ms (labels: `job_type`)

## API

### `initObservability(config)`

Initialize the OTEL SDK. Must be called before other imports.

```typescript
initObservability({
  serviceName: "@dxta/orchestrator",
  otlpEndpoint: "http://localhost:4317", // for local testing
});
```

### `traceJob(jobType, operation, fn)`

Execute a function within a traced span with automatic metrics.

```typescript
import { traceJob } from "@dxta/observability";

await traceJob("extract-merge-request", "fetch-data", async () => {
  // Your job logic here
  return await fetchMergeRequest(id);
});
```

### `logInfo(message, attributes?)`

Emit an OTEL log record and mirror it to stdout.

```typescript
import { logInfo } from "@dxta/observability";

logInfo("@dxta/orchestrator ready");
```

### `recordJobExecuted(attrs)` / `recordJobFailed(attrs)` / `recordJobDuration(ms, attrs)`

Manual metric recording:

```typescript
import { recordJobExecuted, recordJobDuration } from "@dxta/observability";

const start = Date.now();
await doWork();
recordJobExecuted({ job_type: "my-job", status: "success" });
recordJobDuration(Date.now() - start, { job_type: "my-job" });
```

### `shutdownObservability()`

Graceful shutdown - flushes pending telemetry.

```typescript
import { shutdownObservability } from "@dxta/observability";

process.on("SIGTERM", async () => {
  await shutdownObservability();
  process.exit(0);
});
```

## Package Structure

```
packages/observability/
├── src/
│   ├── index.ts          # Public API exports
│   ├── init.ts           # SDK initialization
│   ├── resource.ts       # Resource attributes (service name, etc.)
│   ├── instrumentations.ts  # Auto-instrumentations (HTTP)
│   ├── exporters.ts      # OTLP gRPC exporters
│   └── metrics.ts        # Custom metrics helpers
```

## Resource Attributes

Every span and metric includes:

- `service.name` - from config
- `service.version` - from config
- `service.instance.id` - unique per process
- `deployment.environment` - from `NODE_ENV`

## Instrumentations

### Auto

- **HTTP** (`@opentelemetry/instrumentation-http`) - All HTTP/HTTPS requests
  - Ignores `/health` endpoints

### Manual

- **Database** - Not auto-instrumented; add manual spans for Turso/LibSQL queries
- **Temporal** - Use Temporal's OpenTelemetry interceptors for workflow tracing

## Dependencies

Uses **OpenTelemetry JavaScript SDK 2.0** (requires Node.js ^18.19.0 || >=20.6.0):

```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-node": "^0.211.0",
  "@opentelemetry/sdk-trace-node": "^2.5.0",
  "@opentelemetry/sdk-metrics": "^2.5.0",
  "@opentelemetry/sdk-logs": "^0.211.0",
  "@opentelemetry/resources": "^2.3.0",
  "@opentelemetry/semantic-conventions": "^1.39.0",
  "@opentelemetry/exporter-trace-otlp-grpc": "^0.211.0",
  "@opentelemetry/exporter-logs-otlp-grpc": "^0.211.0",
  "@opentelemetry/exporter-metrics-otlp-grpc": "^0.211.0",
  "@opentelemetry/instrumentation": "^0.208.0",
  "@opentelemetry/instrumentation-http": "^0.211.0"
}
```

### SDK 2.0 Changes

- **Semantic Conventions**: Uses new `ATTR_*` constants (e.g., `ATTR_SERVICE_NAME` instead of `SEMRESATTRS_SERVICE_NAME`)
- **Resources**: Direct `Resource` class import instead of namespace
- **Performance**: Better tree-shaking and ES2022 compilation target

## Local Testing

Run a local collector:

```bash
docker run -p 4317:4317 otel/opentelemetry-collector
```

Set endpoint:

```typescript
initObservability({
  serviceName: "@dxta/test",
  otlpEndpoint: "http://localhost:4317",
});
```

## Invariants

- `initObservability()` must be called before any instrumented code runs
- SDK is singleton - multiple init calls are no-ops with warning
- Shutdown flushes all pending telemetry before returning

## Contracts

- Exports traces, logs, and metrics via OTLP/gRPC
- Batches exports every 60 seconds for metrics
- Graceful shutdown on SIGTERM/SIGINT
- Metrics export is configured via NodeSDK `metricReaders`

## Related

- [OTEL Node.js Docs](https://opentelemetry.io/docs/languages/js/)
- [Implementation Plan](../plans/otel-observability.md)
- [Temporal Observability](https://docs.temporal.io/develop/typescript/observability)
