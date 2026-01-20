# Agent Guide

This repo is a TypeScript monorepo using pnpm workspaces. Apps live in
`apps/*` and shared code lives in `packages/*`. Task orchestration is done
directly with pnpm (no Turbo).

## Quick Facts

- Package manager: pnpm (`packageManager` in `package.json`)
- Node: >= v18.17.1
- Workspaces: `apps/*`, `packages/*`, `packages/{config,integrations,schemas,functions}/*`
- Primary language: TypeScript
- Lint/format: Biome (`biome.json`)
- Tests: Jest in selected packages
- Infra app: SST in `apps/stack`

## Root Commands

Run from repo root. These scripts are recursive and use `--if-present`.

- Install: `pnpm install` (CI: `pnpm install --frozen-lockfile`)
- Build all: `pnpm run build`
- Dev all: `pnpm run dev`
- Lint all: `pnpm run lint`
- Lint fix all: `pnpm run lint:fix`
- Format all: `pnpm run format`
- Type-check all: `pnpm run type-check`
- Test all: `pnpm run test`
- Clean node_modules: `pnpm run clean`
- Clean workspaces: `pnpm run clean:workspaces`
- DB generate: `pnpm run db:generate`

## Workspace Commands

Prefer `pnpm --filter` for a single package or app.

- `pnpm --filter @dxta/transform-functions lint`
- `pnpm --filter @dxta/extract-functions test`
- `pnpm --filter ./apps/stack dev`
- `pnpm --filter ./packages/schemas/transform type-check`

## Running a Single Test

Jest runs at the package level. Use `--runTestsByPath` or `-t`.

- By file:
  - `pnpm --filter @dxta/transform-functions test -- --runTestsByPath src/parse-hunks.test.ts`
- By name:
  - `pnpm --filter @dxta/transform-functions test -- -t "parse hunks"`
- Another package:
  - `pnpm --filter @dxta/source-control test -- --runTestsByPath src/github/client.test.ts`

## Stack App (SST)

Located in `apps/stack`.

- Dev: `pnpm --filter ./apps/stack dev`
- Build: `pnpm --filter ./apps/stack build`
- Deploy: `pnpm --filter ./apps/stack deploy`
- Deploy with stage: `pnpm --filter ./apps/stack deploy:stage -- prod`
- Remove: `pnpm --filter ./apps/stack remove`
- Console: `pnpm --filter ./apps/stack console`

## Formatting and Linting

Biome is the formatter and linter.

- Format: `pnpm run format` (uses `biome format --write .`)
- Lint: `pnpm run lint` (uses `biome lint .`)
- Lint fix: `pnpm run lint:fix` (uses `biome check --write .`)

Biome defaults from `biome.json`:

- Indent: 2 spaces
- Line width: 80
- Quotes: double
- Semicolons: always
- Trailing commas: all
- Imports: organized automatically (`organizeImports` enabled)

## Import Style

- Let Biome handle import ordering and formatting.
- Use `import type` for type-only imports when it improves clarity.
- Prefer explicit relative paths over deep index re-exports unless a package
  already exposes a stable public API.

## TypeScript Conventions

Global TS settings are strict (`tsconfig.json`). Notable options:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noEmit: true`
- `checkJs: true` and `allowJs: true`
- `isolatedModules: true`

Guidelines:

- Type public APIs and exported functions explicitly.
- Avoid `any`; prefer `unknown` with narrowing.
- Use `as const` for literal-heavy config objects.
- Keep nullability explicit in return types.

## Naming Conventions

- Files: `kebab-case` (e.g. `merge-request-diffs.ts`)
- Functions/variables: `camelCase`
- Types/interfaces/enums: `PascalCase`
- Constants: `camelCase` for values, `UPPER_SNAKE_CASE` for env keys

## Error Handling

- Throw explicit errors with context (ids, URLs, provider name).
- Avoid swallowing errors unless a retry/backoff is handled nearby.
- For external API calls, include rate-limit or retry metadata if available.

## Code Organization

- Schemas: `packages/schemas/*`
- Shared functions: `packages/functions/*`
- Integrations: `packages/integrations/*`
- Apps: `apps/*` (Temporal workers/workflows, stack infra)

## Tests

- Jest configs live per package (`jest.config.*`).
- Co-locate tests as `*.test.ts` next to modules.
- Keep tests deterministic and avoid network calls unless mocked.

## Lint/Format Workflow

- Run `pnpm run lint` and `pnpm run format` before changes land.
- Use `pnpm run lint:fix` for autofixes.
- If CI is missing, ensure local checks cover lint, type-check, and tests.

## Cursor/Copilot Rules

- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` were found.

## Notes for Agents

- Do not modify generated files unless the task requires it.
- Keep changes scoped to the requested packages.
- Prefer workspace-level commands over ad-hoc scripts.
- Avoid adding comments unless they explain non-obvious logic.
