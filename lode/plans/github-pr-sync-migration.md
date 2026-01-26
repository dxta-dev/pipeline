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

Two-phase approach: Phase A adds merger/closer extraction to enrich existing data,
Phase B switches to V2 pagination.

### Phase A: Merger/Closer Extraction (Next)

Add activities to fetch `mergerExternalId` and `closerExternalId` per-PR. This
works with the existing pagination and adds value immediately.

**New activities to add:**

1. `extractMergeRequestMerger` - Calls `fetchMergeRequestMerger` for merged PRs
   - Input: `{ tenantId, tenantDbUrl, repositoryId, namespaceId, mergeRequestId, sourceControl }`
   - Queries DB for PR's `canonId` (PR number) and `mergedAt`
   - Only calls API if `mergedAt` is set
   - Updates `mergeRequests.mergerExternalId` in DB

2. `extractMergeRequestCloser` - Calls `fetchMergeRequestCloser` for closed-unmerged PRs
   - Input: `{ tenantId, tenantDbUrl, repositoryId, namespaceId, mergeRequestId, sourceControl }`
   - Queries DB for PR's `canonId`, `closedAt`, `mergedAt`
   - Only calls API if `closedAt` is set AND `mergedAt` is null
   - Updates `mergeRequests.closerExternalId` in DB

**Workflow changes:**

Update `extractMergeRequestWorkflow` to call merger/closer after existing activities:

```ts
export async function extractMergeRequestWorkflow(input) {
  await extractMergeRequestDiffs(input);
  await extractMergeRequestCommits(input);
  await extractMergeRequestNotes(input);

  if (input.sourceControl === "github") {
    await extractTimelineEvents(input);
    // New: enrich merger/closer
    await extractMergeRequestMerger(input);
    await extractMergeRequestCloser(input);
  }
}
```

### Phase B: V2 Pagination (Later)

Replace Search API pagination with watermark-based pagination. Lower priority
since Phase A doesn't depend on it.

1. Create `getMergeRequestsV2` function in `packages/functions/extract`
2. Create `extractMergeRequestsV2` activity
3. Update `extractRepositoryWorkflow` to use `hasMore` loop instead of `totalPages`
4. Remove deprecated `fetchMergeRequests` after migration complete

## Implementation Tasks

### Integration Layer (Complete)
1. [x] Add `fetchMergeRequestsV2` with watermark-based pagination (new method)
2. [x] Add `fetchMergeRequestMerger` method (`merged_by` not in `pulls.list`)
3. [x] Only store `mergeCommitSha` when `merged_at` is present in V2
4. [x] Add `fetchMergeRequestCloser` method for Issues API
5. [x] Update `SourceControl` interface with new methods

### Phase A: Merger/Closer Activities (Next)
6. [ ] Add `extractMergeRequestMerger` activity to `ExtractActivities` interface
7. [ ] Add `extractMergeRequestCloser` activity to `ExtractActivities` interface
8. [ ] Implement activities in `apps/worker-extract/src/activities/extract-activities.ts`
9. [ ] Update `extractMergeRequestWorkflow` to call merger/closer activities

### Phase B: V2 Pagination (Later)
10. [ ] Create `getMergeRequestsV2` function in `packages/functions/extract`
11. [ ] Create `extractMergeRequestsV2` activity
12. [ ] Update `extractRepositoryWorkflow` to use `hasMore` pagination loop
13. [ ] Remove deprecated `fetchMergeRequests` after activities migrated

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
