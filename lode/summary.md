# Lode Summary

This repo is a TypeScript monorepo that currently runs extract/transform
pipelines via SST stacks in `apps/stack`, with an active migration to Temporal
on Railway. The migration introduces four new apps: `apps/workflows` (workflow
definitions), `apps/worker-extract` (extract activities), `apps/worker-transform`
(transform activities), and `apps/orchestrator` (manual triggers and schedules).
Drizzle and integrations remain in `packages/`. The migration replaces
EventBus/SQS/API Gateway/Cron with Temporal workflows, activities, and schedules.

## Invariants
- Source of truth for current infra remains `apps/stack` until Temporal workers ship.
- Workflow code is deterministic and lives only in `apps/workflows`.
- Activities encapsulate all I/O and can use `packages/functions`,
  `packages/integrations`, and `packages/schemas`.
- Task queues: `extract` for extract pipeline, `transform` for transform pipeline.

## Contracts
- Workers connect via `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE`.
- Extract workers poll `extract` queue; transform workers poll `transform` queue.

## Rationale
- Temporal on Railway replaces AWS-only infra while preserving existing data and
  integrations.

## Lessons
- Fanout and orchestration stay in workflows; retries/timeouts replace DLQs.

## Code Example
```ts
export interface ExtractTenantsInput {
  tenantId?: string;
  sourceControl?: "github" | "gitlab";
  runMode: "full" | "incremental";
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
- [Terminology](terminology.md)
- [Practices](practices.md)
