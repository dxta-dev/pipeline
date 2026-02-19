# Extract Worker Implementation

The extract worker (`apps/worker-extract`) executes extract activities for the
Temporal-based pipeline. It polls the `extract` task queue and runs activities
that fetch data from GitHub APIs and store it in tenant databases.

## Structure

```
apps/worker-extract/
  src/
    index.ts              # Worker entry point
    env.ts                # Environment variable validation
    context.ts            # Database and source control initialization
    activities/
      extract-activities.ts  # All extract activity implementations
      index.ts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEMPORAL_ADDRESS` | Temporal server address | `localhost:7233` |
| `TEMPORAL_NAMESPACE` | Temporal namespace | `default` |
| `TENANT_DATABASE_AUTH_TOKEN` | Turso auth token for tenant DBs | required |
| `SUPER_DATABASE_URL` | Super DB URL | required |
| `SUPER_DATABASE_AUTH_TOKEN` | Super DB auth token | required |
| `GITHUB_APP_ID` | GitHub App id | required |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key | required |
| `PER_PAGE` | Pagination size | `30` |
| `FETCH_TIMELINE_EVENTS_PER_PAGE` | Timeline events page size | `1000` |

## Activities

All activities are defined in `extractActivities` object and implement the
`ExtractActivities` interface from `@dxta/workflows`. Activities that return
result objects enable workflow fanout patterns.

| Activity | Returns | Purpose |
|----------|---------|---------|
| `getTenants` | `Tenant[]` | Fetch tenants from super database |
| `getRepositoriesForTenant` | `RepositoryInfo[]` | List repositories for a tenant |
| `extractRepository` | `ExtractRepositoryResult` | Extract repository metadata, create crawl instance |
| `extractMergeRequests` | `ExtractMergeRequestsResult` | Extract merge requests for a repository |
| `extractMergeRequestDiffs` | `void` | Extract diffs for a merge request |
| `extractMergeRequestCommits` | `void` | Extract commits for a merge request |
| `extractMergeRequestNotes` | `void` | Extract notes/comments for a merge request |
| `extractTimelineEvents` | `void` | Extract GitHub timeline events (GitHub only) |
| `extractMembers` | `ExtractMembersResult` | Extract repository members |
| `extractMemberInfo` | `void` | Extract detailed member info |
| `extractNamespaceMembers` | `void` | Extract namespace/org members |
| `extractDeployments` | `ExtractDeploymentsResult` | Extract deployments for a repository |
| `extractDeploymentStatus` | `void` | Extract deployment status |
| `extractDefaultBranchCommits` | `void` | Extract commits on default branch |
| `extractWorkflowDeployments` | `ExtractWorkflowDeploymentsResult` | Extract GitHub workflow deployments |
| `extractWorkflowDeploymentStatus` | `void` | Extract workflow deployment status |

Activities returning `*Result` types provide IDs for subsequent fanout. For
example, `extractWorkflowDeployments` returns `{ deploymentIds: number[] }`
containing deployments with `status=null` or `status='pending'`, which the
workflow uses to call `extractWorkflowDeploymentStatus` for each.

## Context Initialization

- `initDatabase(dbUrl)` - Creates a Drizzle client for a tenant database
- `initSuperDatabase()` - Creates a Drizzle client for the super database
- `initSourceControl({ tenantId, sourceControl })` - Loads GitHub App installation id
  from `tenant_source_control` in the super DB and builds a GitHub client with
  an installation token

## Running the Worker

```bash
# Development
pnpm run dev --workspace @dxta/worker-extract

# Production
pnpm run build --workspace @dxta/worker-extract
pnpm run start --workspace @dxta/worker-extract
```

## Invariants

- Activities must not import from `@temporalio/workflow` (non-deterministic).
- All I/O happens in activities, never in workflows.
- GitHub App installation tokens are fetched on demand.

## Contracts

- Worker polls `extract` task queue.
- Workflows are loaded from `@dxta/workflows` package.
- Activity functions match `ExtractActivities` interface exactly.
- Workflow OTEL sink uses an OpenTelemetry `Resource` compatible with Temporal's interceptors.

## Rationale

- Shared `packages/functions/extract` functions reduce duplication.
- Environment validation via Zod catches config errors at startup.

## Lessons

- Activities should be granular for better retry isolation.
- Child workflows provide better visibility than deeply nested activities.

## Code Example

```ts
const worker = await Worker.create({
  connection,
  namespace: env.TEMPORAL_NAMESPACE,
  taskQueue: "extract",
  workflowsPath: require.resolve("@dxta/workflows"),
  activities: extractActivities,
});
```

## Diagram

```mermaid
flowchart TD
  subgraph worker[apps/worker-extract]
    entry[src/index.ts]
    env[src/env.ts]
    ctx[src/context.ts]
    acts[src/activities/]
  end

  entry --> env
  entry --> acts
  acts --> ctx
  ctx --> superdb[Super DB]
  ctx --> github[GitHub App]
  ctx --> turso[Turso DBs]
  acts --> extractFns[packages/functions/extract]
```

## Related

- [Baseline design](baseline-design.md)
- [Migration plan](../plans/temporal-migration.md)
- [Summary](../summary.md)
