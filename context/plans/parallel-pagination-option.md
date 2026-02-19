# Parallel Pagination Option for V2 API

Future optimization opportunity for `extractMergeRequestsV2` pagination.

## Current Decision

Sequential pagination was chosen for the initial V2 implementation because:

- Simpler to implement and reason about
- Watermark-based early exit can cause wasted API calls in parallel batches
- Pulls API is more reliable than Search API, reducing urgency for speed optimization

## Parallel Batching Approach

If performance becomes a bottleneck, consider speculative parallel fetching:

```ts
// Fetch page 1, then speculatively fetch pages 2-N in parallel
const firstPage = await extractMergeRequestsV2({ page: 1, ... });

if (firstPage.hasMore && !firstPage.reachedWatermark) {
  // Speculative batch: fetch next N pages in parallel
  const BATCH_SIZE = 5;
  const batch = await Promise.all(
    Array.from({ length: BATCH_SIZE }, (_, i) =>
      extractMergeRequestsV2({ page: i + 2, ... })
    )
  );
  
  // Process results, stop at first reachedWatermark or !hasMore
  for (const result of batch) {
    allMergeRequestIds.push(...result.mergeRequestIds);
    if (result.reachedWatermark || !result.hasMore) break;
  }
  
  // Continue with next batch if needed...
}
```

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Sequential | Simple, no wasted calls | Slower for large repos |
| Parallel batch | Faster throughput | Wasted calls if watermark hit mid-batch |

## When to Revisit

Consider parallel batching if:

- Large repos show slow extraction times (> 5 minutes for MR pagination)
- API rate limits are not a concern
- Watermark hits are rare (most repos have recent activity)

## Related

- [GitHub PR Sync Migration](./github-pr-sync-migration.md)
- [Extract worker](../temporal/extract-worker.md)
