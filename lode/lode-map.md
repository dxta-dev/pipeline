# Lode Map

- `lode/summary.md`
- `lode/terminology.md`
- `lode/practices.md`
- `lode/stack/summary.md`
- `lode/stack/extract-auth.md`
- `lode/tooling/monorepo-commands.md`
- `lode/plans/github-app-auth.md`
- `lode/plans/temporal-migration.md`
- `lode/temporal/baseline-design.md`
- `lode/temporal/extract-worker.md`

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
  "lode/stack/summary.md",
  "lode/stack/extract-auth.md",
  "lode/tooling/monorepo-commands.md",
  "lode/plans/github-app-auth.md",
  "lode/plans/temporal-migration.md",
  "lode/temporal/baseline-design.md",
  "lode/temporal/extract-worker.md",
];
```

## Diagram
```mermaid
flowchart TD
  lode[lode/] --> core[core files]
  lode --> plans[plans/]
  lode --> stack[stack/]
  lode --> temporal[temporal/]
  lode --> tooling[tooling/]
  core --> summary[summary.md]
  core --> terminology[terminology.md]
  core --> practices[practices.md]
  plans --> migration[temporal-migration.md]
  plans --> githubAuth[github-app-auth.md]
  stack --> stackSummary[summary.md]
  stack --> stackAuth[extract-auth.md]
  tooling --> commands[monorepo-commands.md]
  temporal --> baseline[baseline-design.md]
  temporal --> extractWorker[extract-worker.md]
```

## Related
- [Summary](summary.md)
- [Temporal migration plan](plans/temporal-migration.md)
- [Monorepo commands](tooling/monorepo-commands.md)
- [Temporal baseline design](temporal/baseline-design.md)
- [Extract worker](temporal/extract-worker.md)
