# GitHub PR sync — migrate from Search API to Pulls + Issues

You’re currently using GitHub’s **Search API** (`GET /search/issues`) to ingest pull requests.
This doc explains why that’s brittle for “sync all PRs” use cases, and proposes a migration to:

* **Pulls API** for listing + PR-native fields
* **Issues API** (and optionally **Issue Timeline**) to attribute *who closed* a PR

The goal is to populate our DB model:

```ts
export type NewMergeRequestWithSha = Omit<NewMergeRequest, "mergeCommitShaId"> & {
  mergeCommitSha?: string | null;
};

export const mergeRequests = sqliteTable(
  "merge_requests",
  {
    id: integer("id").primaryKey(),
    externalId: integer("external_id").notNull(),
    /* Gitlab -> iid, GitHub -> number */
    canonId: integer("canon_id").notNull(),
    repositoryId: integer("repository_id")
      .references(() => repositories.id)
      .notNull(),

    mergeCommitShaId: integer("repository_sha_id").references(
      () => repositoryShas.id,
    ),

    title: text("title").notNull(),
    description: text("description").default(""),
    webUrl: text("web_url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
    mergedAt: integer("merged_at", { mode: "timestamp_ms" }),
    mergerExternalId: integer("merger_external_id"),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
    closerExternalId: integer("closer_external_id"),
    authorExternalId: integer("author_external_id"),
    state: text("state"),
    targetBranch: text("target_branch"),
    sourceBranch: text("source_branch"),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
);
```

---

## Current implementation note

* The function currently using the Search API is **`fetchMergeRequests`**.
* This function should be considered deprecated once the migration described below is complete.

---

## Why migrate away from Search API

### Search API (`/search/issues`) problems for our use case

1. **Cannot reliably fetch “all PRs”**

* Search is capped at **1,000 results per query**.
* For repos with >1,000 PRs (or a broad query), you cannot enumerate everything without complicated chunking.

2. **Returns issue-shaped results (not PR-shaped)**

* Missing PR-native fields we need: branch refs, merge commit SHA, merged-by user, etc.

3. **Rate limits**

* Search endpoints have their own stricter rate limits (typically far lower than normal REST requests).

Conclusion: Search is excellent for “find matching PRs”, but it’s a poor fit for “sync all PRs and keep them fresh”.

---

## Recommended approach

### Primary ingestion: Pulls list endpoint

Use:

* `GET /repos/{owner}/{repo}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=N`

This gives:

* stable enumeration by repo
* server-side sorting by `updated`
* PR-native fields required by our schema (branch refs, merge fields)

### Attribution for closerExternalId

You defined:

> `closerExternalId` is the ID of the person that closed the PR.

On GitHub, closure attribution is not consistently present in `/pulls` list responses.
Best practice:

* If the PR was **merged**: set closer to the merger

  * `closerExternalId = merged_by.id`
* If the PR was **closed without merging**: fetch issue details and use `closed_by.id`

  * `GET /repos/{owner}/{repo}/issues/{pull_number}`
  * `closerExternalId = closed_by.id`

Optional fallback (if `closed_by` isn’t available in your auth/context):

* use the **issue timeline** to find a close event and read `actor.id`

  * `GET /repos/{owner}/{repo}/issues/{pull_number}/timeline`

---

## Field mapping (GitHub → merge_requests)

### From Pulls API

Use either the list response (for bulk) or `GET /repos/{owner}/{repo}/pulls/{pull_number}` for a single PR.

| merge_requests field | GitHub field (Pulls)         | Notes                                                                   |
| -------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `externalId`         | `id`                         | PR REST object id                                                       |
| `canonId`            | `number`                     | PR number (our canon id)                                                |
| `title`              | `title`                      |                                                                         |
| `description`        | `body`                       |                                                                         |
| `webUrl`             | `html_url`                   |                                                                         |
| `createdAt`          | `created_at`                 | convert to ms                                                           |
| `updatedAt`          | `updated_at`                 | convert to ms                                                           |
| `closedAt`           | `closed_at`                  | convert to ms                                                           |
| `mergedAt`           | `merged_at`                  | convert to ms                                                           |
| `mergerExternalId`   | `merged_by.id`               | only when merged                                                        |
| `state`              | `state` (+ merged awareness) | `state` is open/closed. Treat merged separately via `merged_at != null` |
| `targetBranch`       | `base.ref`                   |                                                                         |
| `sourceBranch`       | `head.ref`                   |                                                                         |
| `mergeCommitSha`     | `merge_commit_sha`           | See nuance below                                                        |

### From Issues API (only when needed)

| merge_requests field | GitHub field (Issues) | When                          |
| -------------------- | --------------------- | ----------------------------- |
| `closerExternalId`   | `closed_by.id`        | for closed-but-not-merged PRs |

---

## Important nuance: mergeCommitSha

GitHub’s `merge_commit_sha` has two meanings depending on PR state:

* **Open PRs**: GitHub may generate a *test merge commit* SHA used for mergeability checks.

  * It can change as base/head changes.
* **Merged PRs**: it becomes the SHA representing the actual merge result (merge commit / squash / rebase outcome).

Practical recommendation:

* Store `merge_commit_sha` for **merged PRs** as authoritative.
* For **open PRs**, store it only if you explicitly want the transient “test merge” SHA.

---

## Minimal-call sync algorithm

### Full sync / backfill

1. Page through pulls sorted by updated:

   * `/pulls?state=all&sort=updated&direction=desc&per_page=100&page=N`
2. For each PR item:

   * Always map Pulls fields into `merge_requests`.
   * Determine closure attribution:

     * If `merged_at != null`:

       * `closerExternalId = merged_by.id`
       * `mergerExternalId = merged_by.id`
     * Else if `state == "closed"`:

       * Fetch Issue once: `/issues/{number}`
       * `closerExternalId = closed_by?.id ?? null`
     * Else (open):

       * `closerExternalId = null`

This makes extra calls **only for closed-unmerged PRs**.

### Incremental sync

Keep a watermark:

* `lastUpdatedAtSynced`

Run periodically:

1. Pull newest pages from `/pulls?sort=updated&direction=desc`.
2. Stop when you hit PRs with `updated_at <= lastUpdatedAtSynced`.
3. Apply the same per-PR closer logic as above.

---

## Migration plan (Search → Pulls+Issues)

1. Implement the Pulls listing ingestion path (do not remove Search yet).
2. Backfill:

   * Run the full sync algorithm to populate/refresh all merge_requests.
3. Verify diffs vs current Search-based ingestion:

   * counts by state
   * sampled PRs: branches, mergedAt, mergeCommitSha, closerExternalId
4. Switch incremental sync to Pulls+Issues.
5. Retire Search usage unless needed for user-facing filtered search features.

---

## Notes / edge cases

* Force-pushes and branch updates will change `updated_at` and can change `merge_commit_sha` for open PRs.
* If `closed_by` is null/missing (depends on auth or API shape), fall back to timeline.
* For “merged via squash/rebase”, the meaning of `merge_commit_sha` may differ (it’s still the resulting commit SHA on base, but not always a classic merge commit).

---

## Endpoints used (summary)

* List PRs (bulk): `GET /repos/{owner}/{repo}/pulls`
* Get PR (optional): `GET /repos/{owner}/{repo}/pulls/{pull_number}`
* Get issue for PR number: `GET /repos/{owner}/{repo}/issues/{issue_number}`
* Issue timeline (fallback): `GET /repos/{owner}/{repo}/issues/{issue_number}/timeline`

