# Source Control Integration

`@dxta/source-control` provides a provider-agnostic `SourceControl` interface
plus GitHub and GitLab implementations used by extract functions and workers.

## Invariants
- Public exports are limited to `GitHubSourceControl`, `GitlabSourceControl`,
  `SourceControl` types, and GitHub rate-limit helpers from
  `packages/integrations/source-control/src/index.ts`.
- Provider implementations return `@dxta/extract-schema`-compatible payloads
  (`NewMergeRequestWithSha`, `NewDeploymentWithSha`, `NewMember`, etc.).
- GitHub is the most complete provider; GitLab still throws
  `Method not implemented.` for timeline events, commits, and deployment APIs.

## Contracts
- `SourceControl.fetchMergeRequestsV2(...)` is the GitHub-forward contract for
  MR pagination with `{ hasMore, reachedWatermark }` instead of total pages.
- `githubErrorMod(...)` wraps provider methods and upgrades Octokit 403 +
  exhausted headers into `RateLimitExceededError` carrying parsed reset state.
- Pagination return values use one of two contract shapes:
  `Pagination { page, perPage, totalPages }` or merge-request-v2
  `{ page, perPage, hasMore }`.

## Rationale
- A single interface lets extract functions stay provider-neutral while handling
  GitHub/GitLab API differences inside this package.

## Lessons
- GitHub collaborator listing can fail for read-only tokens; implementation
  suppresses that specific error and returns empty members to keep extraction
  progressing.
- Large PR diffs on GitHub can return 422; implementation emits a sentinel
  `urn:dxta-pipeline:very-large-diff` record so downstream code still receives a
  deterministic diff entry.

## Code Example
```ts
export interface SourceControl {
  fetchMergeRequestsV2?(
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
  }>;
}
```

## Diagram
```mermaid
flowchart LR
  worker[apps/worker-extract] --> functions[@dxta/extract-functions]
  functions --> iface[SourceControl interface]
  iface --> gh[GitHubSourceControl]
  iface --> gl[GitlabSourceControl]
  gh --> octokit[Octokit REST API]
  gl --> gitbeaker[GitBeaker API]
  gh --> mod[githubErrorMod]
  mod --> rate[RateLimitExceededError]
```

## Related
- [Overview](../overview.md)
- [Extract functions](../functions/extract-functions.md)
- [Patterns](../patterns.md)
- [GitHub source control](github-source-control.md)
