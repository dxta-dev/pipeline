# OpenTelemetry Observability Implementation Plan

## Overview

Add comprehensive observability to all `apps/*` using OpenTelemetry with OTLP export to Railway's internal collector.

**Endpoint**: `http://otel.railway.internal:4317` (gRPC)

## Goals

- Distributed tracing across all Temporal workflows and activities
- Structured logging via OTEL
- Custom metrics (job counters, etc.)
- Auto-instrumentation for HTTP and database queries

## Architecture

```mermaid
flowchart TB
    subgraph apps[Applications]
        orch[orchestrator]
        extract[worker-extract]
        transform[worker-transform]
    end
    
    subgraph otel[OTEL SDK]
        sdk[@dxta/observability]
        traces[TracerProvider]
        logs[LoggerProvider]
        metrics[MeterProvider]
    end
    
    subgraph auto[Auto Instrumentation]
        http[@opentelemetry/instrumentation-http]
        libsql[Custom LibSQL instrumentation]
    end
    
    subgraph export[Export]
        otlp[OTLP gRPC Exporter]
    end
    
    orch --> sdk
    extract --> sdk
    transform --> sdk
    sdk --> traces
    sdk --> logs
    sdk --> metrics
    sdk --> auto
    traces --> otlp
    logs --> otlp
    metrics --> otlp
    otlp --> railway[Railway OTEL Collector]
```

## Implementation Steps

### 1. Create Shared Package

Create `packages/observability/` with:

**Dependencies**:
- `@opentelemetry/api`
- `@opentelemetry/sdk-node`
- `@opentelemetry/sdk-trace-node`
- `@opentelemetry/sdk-logs`
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/exporter-trace-otlp-grpc`
- `@opentelemetry/exporter-logs-otlp-grpc`
- `@opentelemetry/exporter-metrics-otlp-grpc`
- `@opentelemetry/instrumentation-http`
- `@opentelemetry/resources`
- `@opentelemetry/semantic-conventions`

**Files**:
- `src/index.ts` - Main exports
- `src/init.ts` - SDK initialization
- `src/resource.ts` - Resource attributes
- `src/instrumentations.ts` - Auto-instrumentation setup
- `src/metrics.ts` - Custom metrics helpers

### 2. Package Structure

```
packages/observability/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── init.ts
│   ├── resource.ts
│   ├── instrumentations.ts
│   └── metrics.ts
```

### 3. Core Implementation

**Initialization** (`init.ts`):
- Create NodeSDK with:
  - OTLP gRPC exporters for traces, logs, metrics
  - Resource with service name, version
  - Auto-instrumentations (HTTP)
  - Custom LibSQL instrumentation (if feasible)
- Always-on sampling
- Flush on shutdown

**Resource Attributes** (`resource.ts`):
- `service.name` - from package name
- `service.version` - from package.json
- `service.instance.id` - unique per process
- `deployment.environment` - from `NODE_ENV`

**Metrics** (`metrics.ts`):
- Counter: `jobs.executed` (labels: job_type, status)
- Counter: `jobs.failed` (labels: job_type)
- Histogram: `job.duration` (labels: job_type)

### 4. Per-App Integration

Each app needs:

1. **Early initialization** - Import and call `initObservability()` before any other imports
2. **Env var** - Add `OTEL_EXPORTER_OTLP_ENDPOINT` to env schema (optional, defaults to Railway endpoint)
3. **Instrumentation integration** - Use meter/tracer in activities

**Example entrypoint modification**:
```typescript
// Must be first import!
import { initObservability } from "@dxta/observability";
initObservability({
  serviceName: "@dxta/worker-extract",
  serviceVersion: "1.0.0",
});

// Other imports...
```

### 5. Custom Metrics Implementation

**Job counters** in activities:
- Increment `jobs.executed` on activity start
- Record duration on completion
- Increment `jobs.failed` on error

### 6. LibSQL/Turso Instrumentation

Since Turso uses `@libsql/client`, investigate:
- Option 1: Wrap client calls with spans manually
- Option 2: Create custom instrumentation using `@opentelemetry/instrumentation` base

Priority: Manual spans first, custom instrumentation later if needed.

### 7. Temporal Context Propagation

- Use Temporal's OpenTelemetry interceptor for context propagation
- Add `@temporalio/interceptors-opentelemetry` dependency
- Configure worker with interceptors

### 8. Environment Variables

Add to each app:
```typescript
OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://otel.railway.internal:4317"),
OTEL_SERVICE_NAME: z.string().optional(), // override auto-detected name
OTEL_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
```

## File Changes

| File | Status | Change |
|------|--------|--------|
| `packages/observability/package.json` | ✅ | Created with OTEL SDK dependencies |
| `packages/observability/src/*.ts` | ✅ | Created (index, init, resource, instrumentations, metrics, exporters) |
| `packages/observability/tsconfig.json` | ✅ | Configured with `noEmit: false` and `declaration: true` |
| `apps/orchestrator/package.json` | ✅ | Added `@dxta/observability` dependency |
| `apps/orchestrator/src/index.ts` | ✅ | Added initObservability() at top |
| `apps/orchestrator/src/env.ts` | ✅ | Added OTEL env vars |
| `apps/worker-extract/package.json` | ✅ | Added `@dxta/observability` dependency |
| `apps/worker-extract/src/index.ts` | ✅ | Added initObservability() at top |
| `apps/worker-extract/src/env.ts` | ✅ | Added OTEL env vars |
| `apps/worker-extract/src/activities/*.ts` | ⏳ | Add metrics instrumentation |
| `apps/worker-transform/src/index.ts` | ⏳ | Add initObservability() at top |
| `apps/worker-transform/src/env.ts` | ⏳ | Add OTEL env vars |
| `apps/worker-transform/src/activities/*.ts` | ⏳ | Add metrics instrumentation |

## Testing

1. **Local testing**:
   - Run `docker run -p 4317:4317 otel/opentelemetry-collector`
   - Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`
   - Verify spans exported

2. **Metrics verification**:
   - Trigger workflows manually
   - Check counter increments

## Rollout

1. ✅ Create `@dxta/observability` package
2. ✅ Integrate into one app (orchestrator) first
3. ⏳ Test on Railway
4. ⏳ Roll out to workers
5. ⏳ Add custom metrics gradually

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OTEL SDK overhead | Keep sampling at always-on but batch exports |
| Failed exports block app | Use async batch processors |
| Memory leaks from spans | Set reasonable span limits |
| Missing Turso traces | Document limitation, add manual spans for critical queries |

## Success Criteria

- [ ] Traces visible in Railway observability dashboard
- [ ] Logs exported with trace correlation
- [ ] `jobs.executed` counter increments for each activity
- [ ] HTTP requests auto-traced
- [ ] No performance degradation >5%

## Related

- [OTEL Node.js Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Temporal OpenTelemetry Interceptors](https://docs.temporal.io/develop/typescript/observability#open-tracing)
- [Railway Observability](https://docs.railway.com/guides/observability)
