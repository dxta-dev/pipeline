# Lode Map

- `lode/summary.md`
- `lode/terminology.md`
- `lode/practices.md`
- `lode/tooling/monorepo-commands.md`
- `lode/tooling/local-dev.md`
- `lode/tooling/docker-images.md`
- `lode/tooling/migrations.md`
- `lode/tooling/scripts.md`
- `lode/plans/github-app-auth.md`
- `lode/plans/temporal-migration.md`
- `lode/temporal/baseline-design.md`
- `lode/temporal/railway-images.md`
- `lode/temporal/extract-worker.md`
- `lode/temporal/transform-worker.md`
- `lode/temporal/orchestrator.md`

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
  "lode/tooling/migrations.md",
  "lode/tooling/scripts.md",
  "lode/plans/github-app-auth.md",
  "lode/plans/temporal-migration.md",
  "lode/temporal/baseline-design.md",
  "lode/temporal/railway-images.md",
  "lode/temporal/extract-worker.md",
  "lode/temporal/transform-worker.md",
  "lode/temporal/orchestrator.md",
];
```

## Diagram
```mermaid
flowchart TD
  lode[lode/] --> core[core files]
  lode --> plans[plans/]
  lode --> temporal[temporal/]
  lode --> tooling[tooling/]
  core --> summary[summary.md]
  core --> terminology[terminology.md]
  core --> practices[practices.md]
  plans --> migration[temporal-migration.md]
  plans --> githubAuth[github-app-auth.md]
  tooling --> commands[monorepo-commands.md]
  tooling --> localDev[local-dev.md]
  tooling --> migrations[migrations.md]
  tooling --> scripts[scripts.md]
  temporal --> baseline[baseline-design.md]
  temporal --> railwayImages[railway-images.md]
  temporal --> extractWorker[extract-worker.md]
  temporal --> transformWorker[transform-worker.md]
  temporal --> orchestrator[orchestrator.md]
```

## Related

- [Summary](summary.md)
- [Temporal migration plan](plans/temporal-migration.md)
- [Monorepo commands](tooling/monorepo-commands.md)
- [Tooling scripts](tooling/scripts.md)
- [Temporal baseline design](temporal/baseline-design.md)
- [Extract worker](temporal/extract-worker.md)
- [Transform worker](temporal/transform-worker.md)
- [Orchestrator](temporal/orchestrator.md)
