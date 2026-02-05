# Lode Summary

This repo is a TypeScript monorepo running extract/transform pipelines via
Temporal on Railway. `apps/workflows` contains workflow definitions
(`extractTenantsWorkflow`, `extractRepositoryWorkflow`, `extractMergeRequestWorkflow`,
`transformTenantsWorkflow`, `transformRepositoryWorkflow`). `apps/worker-extract`
implements 17 extract activities and `apps/worker-transform` implements 2
transform activities. `apps/orchestrator` creates Temporal schedules on startup
and provides CLI commands for manual workflow triggers. Drizzle schemas and
integrations remain in `packages/`. The `@dxta/observability` package provides
OpenTelemetry SDK for distributed tracing and metrics export to Railway.
GitHub Actions workflows are currently removed; CI/CD is pending. The Nix dev
shell includes Node.js, pnpm, Biome, Temporal CLI, git, and jq.

Temporal infrastructure images for Railway live under `temporal/`, with wrapper
Dockerfiles that bundle dynamic config and scripts for the server and
admin-tools services.

## Invariants
- Workflow code is deterministic and lives only in `apps/workflows`.
- Activities encapsulate all I/O and can use `packages/functions`,
  `packages/integrations`, and `packages/schemas`.
- Task queues: `extract` for extract pipeline, `transform` for transform pipeline.

## Contracts
- Workers connect via `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE`.
- Extract workers poll `extract` queue; transform workers poll `transform` queue.

## Rationale
- Temporal on Railway provides workflow orchestration with built-in retries,
  visibility, and scheduling. Deployment images are built with multi-stage
  Dockerfiles for the orchestrator and both workers.

## Lessons
- Fanout and orchestration stay in workflows; retries/timeouts replace DLQs.

## Code Example
```ts
export interface ExtractTenantsInput {
  tenantId?: number;
  sourceControl?: "github" | "gitlab";
  timePeriod: { from: number; to: number };
}
```

## Diagram
```mermaid
flowchart LR
  orchestrator[apps/orchestrator] --> workflows[apps/workflows]
  workflows --> workerExtract[apps/worker-extract]
  workflows --> workerTransform[apps/worker-transform]
  workerExtract --> packages[packages/*]
  workerTransform --> packages
```

## Related
- [Temporal migration plan](plans/temporal-migration.md)
- [Baseline design](temporal/baseline-design.md)
- [Orchestrator](temporal/orchestrator.md)
- [Terminology](terminology.md)
- [Practices](practices.md)
