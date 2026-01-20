# Practices

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
- [Summary](summary.md)
- [Temporal migration plan](plans/temporal-migration.md)
