# GitHub PR Sync Migration

Migrate GitHub merge request ingestion from Search API to Pulls + Issues for
complete enumeration, PR-native fields, and stable pagination.

## New Methods (Implemented)

Location: `packages/integrations/source-control/src/github/index.ts`

Three new methods added to `GitHubSourceControl`:

### `fetchMergeRequestsV2`

Replaces `fetchMergeRequests` with watermark-based pagination (no Search API).

- Calls `pulls.list` with `state=all&sort=updated&direction=desc`
- Returns `hasMore` boolean instead of unreliable `totalPages`
- Returns `reachedWatermark` to indicate stop reason
- Only stores `mergeCommitSha` when `merged_at` is present
- Does NOT include `mergerExternalId` (not available in `pulls.list`)

### `fetchMergeRequestMerger`

Fetches merger info for merged PRs via `pulls.get` endpoint.

- Required because `pulls.list` doesn't include `merged_by` field
- Returns `{ mergerExternalId: number | null }`
- Call only for PRs where `mergedAt` is set

### `fetchMergeRequestCloser`

Fetches closer info for closed PRs via `issues.get` endpoint.

- PRs are Issues in GitHub, so we use Issues API for `closed_by`
- Returns `{ closerExternalId: number | null }`
- Call only for PRs where `closedAt` is set but `mergedAt` is null

## Legacy Method (Deprecated)

The old `fetchMergeRequests` method remains unchanged for backward compatibility.
It will be removed after activities are migrated to use `fetchMergeRequestsV2`.

## Invariants

- `mergeCommitSha` is stored only for merged PRs (`merged_at` present).
- `mergerExternalId` requires `pulls.get` (not available in `pulls.list`).
- `closerExternalId` for closed-unmerged PRs comes from Issues `closed_by.id`.
- Open PRs have `closerExternalId = null`.

## Contracts

- Primary enumeration uses `GET /repos/{owner}/{repo}/pulls` with
  `state=all&sort=updated&direction=desc&per_page=100`.
- Pagination stops when `updated_at < period.from` or max pages reached.
- Closed-unmerged PRs require a separate Issues call:
  `GET /repos/{owner}/{repo}/issues/{pull_number}`.

## Rationale

- Search is capped at 1,000 results per query and returns issue-shaped data.
- Pulls list returns PR-native fields (`merged_by`) and supports full enumeration.
- Issues provide reliable closer attribution for closed-unmerged PRs.
- Watermark-based stop is simpler and doesn't require pre-counting.

## Migration Strategy

We use Option C: add new method `fetchMergeRequestsV2`, deprecate old method.

- `fetchMergeRequestsV2` has a clean interface with `hasMore` instead of `totalPages`
- `fetchMergeRequests` remains unchanged for now (backward compatible)
- Activities will be updated in a later step to use V2, then old method removed

## Implementation Tasks

1. [x] Add `fetchMergeRequestsV2` with watermark-based pagination (new method)
2. [x] Add `fetchMergeRequestMerger` method (`merged_by` not in `pulls.list`)
3. [x] Only store `mergeCommitSha` when `merged_at` is present in V2
4. [x] Add `fetchMergeRequestCloser` method for Issues API
5. [x] Update `SourceControl` interface with new methods
6. [ ] Add Temporal activity for merger/closer extraction
7. [ ] Update workflow to call merger/closer extraction
8. [ ] Update extract activities to use `fetchMergeRequestsV2`
9. [ ] Remove deprecated `fetchMergeRequests` after activities migrated

## Code Example

```ts
// fetchMergeRequestsV2 - watermark-based pagination, no Search API
async fetchMergeRequestsV2(
  externalRepositoryId: number,
  namespaceName: string,
  repositoryName: string,
  repositoryId: number,
  perPage: number,
  updatedAfter?: Date,
  page?: number,
): Promise<{
  mergeRequests: NewMergeRequestWithSha[];
  pagination: { page: number; perPage: number; hasMore: boolean };
  reachedWatermark: boolean;
}> {
  // ... calls pulls.list, maps fields, checks watermark
}

// merged_by requires pulls.get (not available in pulls.list)
async fetchMergeRequestMerger(
  namespaceName: string,
  repositoryName: string,
  pullNumber: number,
): Promise<{ mergerExternalId: number | null }> {
  const result = await this.api.pulls.get({ ... });
  return { mergerExternalId: result.data.merged_by?.id ?? null };
}

// closed_by comes from Issues API
async fetchMergeRequestCloser(
  namespaceName: string,
  repositoryName: string,
  pullNumber: number,
): Promise<{ closerExternalId: number | null }> {
  const result = await this.api.issues.get({ ... });
  return { closerExternalId: result.data.closed_by?.id ?? null };
}
```

## Diagram

```mermaid
flowchart TD
  subgraph "fetchMergeRequestsV2 (paginated list)"
    pulls[pulls.list API] --> map[Map PR fields]
    map --> check{oldest updated_at < watermark?}
    check -->|yes| stop[hasMore=false]
    check -->|no| more{link header has next?}
    more -->|yes| next[hasMore=true]
    more -->|no| stop
  end

  subgraph "Per-PR enrichment (separate calls)"
    merged{PR merged?} -->|yes| merger[fetchMergeRequestMerger]
    merger --> pullsGet[pulls.get API]
    pullsGet --> mergerExternalId

    closed{PR closed, not merged?} -->|yes| closer[fetchMergeRequestCloser]
    closer --> issuesGet[issues.get API]
    issuesGet --> closerExternalId
  end
```

## Related

- [Summary](../summary.md)
- [Practices](../practices.md)
- [Terminology](../terminology.md)
- [Extract worker](../temporal/extract-worker.md)
