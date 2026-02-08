# Lode Map

- `lode/summary.md`
- `lode/terminology.md`
- `lode/practices.md`
- `lode/tooling/monorepo-commands.md`
- `lode/tooling/local-dev.md`
- `lode/tooling/docker-images.md`
- `lode/tooling/migrations.md`
- `lode/tooling/scripts.md`
- `lode/observability/package.md`
- `lode/plans/github-app-auth.md`
- `lode/plans/otel-observability.md`
- `lode/plans/parallel-pagination-option.md`
- `lode/temporal/baseline-design.md`
- `lode/temporal/railway-images.md`
- `lode/temporal/extract-worker.md`
- `lode/temporal/transform-worker.md`
- `lode/temporal/orchestrator.md`
- `lode/temporal/basic-auth-proxy.md`

## Invariants
- Every lode file covers one topic and stays under 250 lines.

## Contracts
- All new lode files must be added to this map.

## Rationale
- A single index keeps discovery consistent across sessions.

## Lessons
- Update the map before adding new domain folders.

## Code Example
```ts
export const lodeIndex = [
  "lode/summary.md",
  "lode/terminology.md",
  "lode/practices.md",
  "lode/tooling/monorepo-commands.md",
  "lode/tooling/local-dev.md",
  "lode/tooling/docker-images.md",
  "lode/tooling/migrations.md",
  "lode/tooling/scripts.md",
  "lode/observability/package.md",
  "lode/plans/github-app-auth.md",
  "lode/plans/otel-observability.md",
  "lode/plans/parallel-pagination-option.md",
  "lode/temporal/baseline-design.md",
  "lode/temporal/railway-images.md",
  "lode/temporal/extract-worker.md",
  "lode/temporal/transform-worker.md",
  "lode/temporal/orchestrator.md",
  "lode/temporal/basic-auth-proxy.md",
];
```

## Diagram
```mermaid
flowchart TD
  lode[lode/] --> core[core files]
  lode --> observability[observability/]
  lode --> plans[plans/]
  lode --> temporal[temporal/]
  lode --> tooling[tooling/]
  observability --> obsPackage[package.md]
  core --> summary[summary.md]
  core --> terminology[terminology.md]
  core --> practices[practices.md]
  plans --> githubAuth[github-app-auth.md]
  plans --> otel[otel-observability.md]
  plans --> parallelPagination[parallel-pagination-option.md]
  tooling --> commands[monorepo-commands.md]
  tooling --> localDev[local-dev.md]
  tooling --> migrations[migrations.md]
  tooling --> scripts[scripts.md]
  temporal --> baseline[baseline-design.md]
  temporal --> railwayImages[railway-images.md]
  temporal --> extractWorker[extract-worker.md]
  temporal --> transformWorker[transform-worker.md]
  temporal --> orchestrator[orchestrator.md]
  temporal --> basicAuthProxy[basic-auth-proxy.md]
```

## Related

- [Summary](summary.md)
- [Monorepo commands](tooling/monorepo-commands.md)
- [Tooling scripts](tooling/scripts.md)
- [Temporal baseline design](temporal/baseline-design.md)
- [Extract worker](temporal/extract-worker.md)
- [Transform worker](temporal/transform-worker.md)
- [Orchestrator](temporal/orchestrator.md)
- [Basic auth proxy](temporal/basic-auth-proxy.md)
