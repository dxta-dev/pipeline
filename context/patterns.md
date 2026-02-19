# Patterns

## Invariants
- Keep workflow code deterministic; no I/O or non-deterministic APIs.
- Implement I/O in activities hosted by worker apps under `apps/`.
- Reuse existing logic from `packages/functions`, `packages/integrations`, and
  `packages/schemas` inside activities.

## Contracts
- Workers must register activities and workflows with a shared task queue name.
- Retry policies must be set on activities to replace SQS DLQ behavior.

## Rationale
- Clear workflow/activity boundaries make retry and concurrency behavior
  explicit.

## Lessons
- Keep Temporal-specific code out of `packages/` to avoid cross-cutting imports.
- App tsconfigs must set `"noEmit": false` to override the root config's `"noEmit": true`.
  The root uses `noEmit` for type-checking only; apps that run `tsc` to build need emitted JS.
- App tsconfigs must set `"module": "commonjs"` to override the root's `"module": "esnext"`.
  Node.js without `"type": "module"` in package.json expects CommonJS. ESM output fails with
  `ERR_UNSUPPORTED_DIR_IMPORT` on directory imports like `./activities`.

## Local Development
- Temporal server runs via `temporal server start-dev` (Temporal CLI).
- Workers connect to `localhost:7233` with namespace `default`.

## Code Example
```ts
import { proxyActivities } from "@temporalio/workflow";

import type { ExtractActivities } from "../types/activities";

const { extractTenants } = proxyActivities<ExtractActivities>({
  startToCloseTimeout: "10 minutes",
  retry: { initialInterval: "5 seconds", maximumAttempts: 10 },
});
```

## Diagram
```mermaid
flowchart LR
  plan[Plan] --> workflow[Workflow app]
  workflow --> worker[Worker app]
  worker --> activity[Activities]
```

## Related
- [Overview](overview.md)
- [Temporal migration plan](plans/temporal-migration.md)
