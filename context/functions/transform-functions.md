# Transform Functions

`@dxta/transform-functions` converts extract-stage records into transform-stage
facts/events and computes merge-request metrics.

## Invariants
- Public exports are `run` (from `merge-request-metrics.ts`) and
  `selectMergeRequestsDeployments(...)`.
- `run(...)` reads extract data, enriches timeline events, filters bot activity,
  computes durations/size/review metrics, and upserts transform tables.
- `selectMergeRequestsDeployments(...)` uses a recursive SQL query to map MRs to
  deployments in a time window, plus non-deployed updated MRs.

## Contracts
- `run(extractMergeRequestId, extractDeploymentId, ctx)` requires three DB
  handles in context: `extractDatabase`, `transformDatabase`, `tenantDatabase`.
- `run(...)` is idempotent through upserts and replacement of
  `merge_request_events` for the target merge request.
- `parseHunks(...)` parses unified diff hunks and returns additions/deletions +
  internal change composition (`d`, `i`, `c`).

## Rationale
- The package consolidates all MR metric derivation in one place to keep worker
  code simple and make schema-level transformations reusable.

## Lessons
- Bot filtering combines known ID lists and naming patterns (`[bot]` and GitLab
  service-account regex) before computing timeline metrics.
- Timezone-aware date dimension mapping uses tenant HQ timezone via
  `tenant.tenantConfig.tzdata` and `getUTCOffset(...)`.

## Code Example
```ts
export async function run(
  extractMergeRequestId: number,
  extractDeploymentId: number | null,
  ctx: RunContext,
) {
  // select extract data -> compute metrics -> upsert transform rows
}
```

## Diagram
```mermaid
flowchart TD
  run[run(...)] --> select[select extract MR/deployment/timeline data]
  select --> users[resolve members + known bots]
  users --> metrics[calculate size/timeline/durations]
  metrics --> dates[map timestamps to date dimension]
  dates --> write[upsert merge metrics + events + optional deployment]
  sql[selectMergeRequestsDeployments] --> write
```

## Related
- [Functions domain](packages-functions.md)
- [Transform worker](../temporal/transform-worker.md)
