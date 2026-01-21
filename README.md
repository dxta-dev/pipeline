# DXTA Pipeline

TypeScript monorepo for extract/transform pipelines using Temporal for workflow orchestration.

## Prerequisites

**Option 1: Nix (recommended)**

```bash
nix develop
```

Provides: Node.js 24, pnpm, Biome, Temporal CLI, git, jq

**Option 2: Manual**

- Node.js >= 18.17.1
- pnpm 9.12.2
- Temporal server

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Temporal server

```bash
temporal server start-dev
```

Temporal UI available at http://localhost:8233

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `TENANT_DATABASE_AUTH_TOKEN` | extract, transform | Auth token for tenant databases |
| `SUPER_DATABASE_URL` | extract, transform | Super database connection URL |
| `SUPER_DATABASE_AUTH_TOKEN` | extract, transform | Super database auth token |
| `GITHUB_APP_ID` | extract | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | extract | GitHub App private key (multiline) |

Optional variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal server address |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
| `PORT` | `3000` | Orchestrator HTTP port |
| `PER_PAGE` | `30` | GitHub API pagination size |
| `FETCH_TIMELINE_EVENTS_PER_PAGE` | `1000` | Timeline events per page |
| `EXTRACT_SCHEDULE_ENABLED` | `true` | Enable extract schedule |
| `TRANSFORM_SCHEDULE_ENABLED` | `true` | Enable transform schedule |

### 4. Start workers

Run in separate terminals:

```bash
# Extract worker (polls 'extract' queue)
pnpm --filter @dxta/worker-extract dev

# Transform worker (polls 'transform' queue)
pnpm --filter @dxta/worker-transform dev

# Orchestrator (creates schedules, exposes health endpoint)
pnpm --filter @dxta/orchestrator dev
```

### 5. Trigger workflows manually

```bash
# Start extract workflow
pnpm --filter @dxta/orchestrator start:extract

# Start transform workflow
pnpm --filter @dxta/orchestrator start:transform
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Orchestrator  │────▶│         Temporal Server              │
│  (schedules +   │     │         localhost:7233               │
│   CLI triggers) │     └──────────────┬───────────────────────┘
└─────────────────┘                    │
                                       ▼
                    ┌──────────────────┴──────────────────┐
                    │                                     │
            ┌───────▼───────┐                   ┌─────────▼─────────┐
            │ worker-extract│                   │ worker-transform  │
            │ (queue:extract)│                   │ (queue:transform) │
            └───────┬───────┘                   └─────────┬─────────┘
                    │                                     │
                    ▼                                     ▼
            ┌───────────────┐                   ┌─────────────────┐
            │  GitHub API   │                   │    Databases    │
            │  + Databases  │                   │                 │
            └───────────────┘                   └─────────────────┘
```

## Project Structure

```
apps/
  orchestrator/      # Schedule management and CLI commands
  worker-extract/    # Extract pipeline worker (17 activities)
  worker-transform/  # Transform pipeline worker (2 activities)
  workflows/         # Temporal workflow definitions
  stack/             # Legacy SST/AWS infra (deprecated)

packages/
  config/            # Shared configuration
  functions/         # Business logic (extract, transform, crawl)
  integrations/      # External service clients (source-control)
  schemas/           # Database schemas (Drizzle)
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build all packages |
| `pnpm run dev` | Start all apps in dev mode (parallel) |
| `pnpm run type-check` | Type-check all packages |
| `pnpm run lint` | Lint with Biome |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run format` | Format with Biome |
| `pnpm run test` | Run all tests |
| `pnpm run db:generate` | Generate database migrations |

### Single package commands

```bash
pnpm --filter @dxta/worker-extract dev
pnpm --filter @dxta/transform-functions test
pnpm --filter ./apps/orchestrator type-check
```

### Run a single test

```bash
pnpm --filter @dxta/transform-functions test -- --runTestsByPath src/parse-hunks.test.ts
pnpm --filter @dxta/transform-functions test -- -t "parse hunks"
```

## Workflows

**Extract pipeline:**
- `extractTenantsWorkflow` - Entry point, fans out to repositories
- `extractRepositoryWorkflow` - Per-repo extraction
- `extractMergeRequestWorkflow` - Per-MR extraction

**Transform pipeline:**
- `transformTenantsWorkflow` - Entry point, fans out to repositories
- `transformRepositoryWorkflow` - Per-repo transformation

## Scheduling

When the orchestrator starts, it creates Temporal schedules:
- **Extract**: Every 15 minutes at minute 8 (`:08`, `:23`, `:38`, `:53`)
- **Transform**: Every 15 minutes on the quarter-hour (`:00`, `:15`, `:30`, `:45`)

## Database Migrations

The project uses Drizzle Kit to generate SQL migrations. There are two migration
targets:

| Schema | Purpose | Output |
|--------|---------|--------|
| `@dxta/combined-schema` | All per-tenant tables | `migrations/combined/` |
| `@dxta/super-schema` | Central tenant registry (deprecated) | `migrations/super/` |

### Generate migrations

```bash
# Generate all migrations
pnpm run db:generate

# Generate combined migrations only
pnpm --filter @dxta/combined-schema db:generate

# Generate super migrations only (deprecated)
pnpm --filter @dxta/super-schema db:generate
```

The `combined-schema` aggregates tables from `extract-schema`, `transform-schema`,
`tenant-schema`, and `crawl-schema`. When you modify any of these base schemas,
regenerate combined migrations.

## Scripts

### Seed Schema

Seeds dimension tables (dates, times, forge users) in a tenant database.

```bash
pnpm tsx scripts/seed-schema.mts -u "<DATABASE_URL>" -t "<AUTH_TOKEN>"
```

Arguments:
- `-u, --url` (required): LibSQL database URL
- `-t, --authToken` (optional): Database auth token

The script seeds data for a 10-year range (5 years before and after the current date).
