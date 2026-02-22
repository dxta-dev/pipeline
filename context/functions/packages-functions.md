# Packages Functions Domain

`packages/functions` contains pure-ish service logic used by activities and
workers. It is split into three active packages (`crawl`, `extract`,
`transform`) plus one placeholder folder (`tenant-activities`) currently with no
files.

## Invariants
- `packages/functions/crawl` exports generic DB-oriented crawl helpers.
- `packages/functions/extract` exports source-control extraction + persistence
  helpers.
- `packages/functions/transform` exports MR-to-metrics transformation logic.
- `packages/functions/tenant-activities` is currently empty and has no runtime
  behavior.

## Contracts
- Each functions package exports from `src/index.ts` and is consumed by worker
  activities.
- `extract` functions require `integrations.sourceControl` in context when the
  function calls provider APIs.
- `transform` `run(...)` requires three databases in context: extract,
  transform, tenant.

## Rationale
- Keeping extract/transform/crawl logic in packages enables reuse from Temporal
  activities while keeping workflow code deterministic.

## Lessons
- Most persistence paths use idempotent upsert patterns (`onConflictDoUpdate`
  and `onConflictDoNothing`) to support retries.

## Code Example
```ts
export * from "./config";
export * from "./get-merge-requests-v2";
export * from "./get-deployments";
```

## Diagram
```mermaid
flowchart LR
  workers[apps/worker-* activities] --> extract[@dxta/extract-functions]
  workers --> transform[@dxta/transform-functions]
  workers --> crawl[@dxta/crawl-functions]
  extract --> extractSchema[@dxta/extract-schema]
  extract --> sourceControl[@dxta/source-control]
  transform --> transformSchema[@dxta/transform-schema]
  transform --> tenantSchema[@dxta/tenant-schema]
  crawl --> crawlSchema[@dxta/crawl-schema]
```

## Related
- [Overview](../overview.md)
- [Patterns](../patterns.md)
- [Extract worker](../temporal/extract-worker.md)
- [Transform worker](../temporal/transform-worker.md)
- [Crawl functions](crawl-functions.md)
- [Extract functions](extract-functions.md)
- [Transform functions](transform-functions.md)
- [Tenant activities placeholder](tenant-activities.md)
