# Agent Guide

This repo is a TypeScript monorepo (npm workspaces + Turborepo) with apps and
packages under `apps/*` and `packages/*`.

## Quick Facts

- Package manager: npm (see `package.json`)
- Node: >= v18.17.1
- Workspaces: apps, packages, config, integrations, schemas, functions
- Primary language: TypeScript
- Linting: ESLint with @dxta shared config
- Formatting: Prettier + sort-imports plugin
- Tests: Jest (per package)

## Commands (root)

Use these from the repo root unless noted.

- Install: `npm install`
- Build all: `npm run build`
- Dev (all packages): `npm run dev`
- Lint all: `npm run lint`
- Lint fix all: `npm run lint:fix`
- Format all: `npm run format`
- Type-check all: `npm run type-check`
- Test all: `npm run test`
- Clean node_modules: `npm run clean`
- Clean workspaces: `npm run clean:workspaces`
- DB generate: `npm run db:generate`

## Workspace Commands

You can run any workspace script with `--workspace <name>`.

- Example: `npm run lint --workspace @dxta/transform-functions`
- Example: `npm run test --workspace @dxta/crawl-functions`
- Example: `npm run type-check --workspace @dxta/stack`

## Running a Single Test

Jest runs at the package level. Use `--runTestsByPath` or `-t`.

- By file:
  - `npm run test --workspace @dxta/transform-functions -- --runTestsByPath src/parse-hunks.test.ts`
- By name:
  - `npm run test --workspace @dxta/transform-functions -- -t "parse hunks"`
- Crawl package (no tests required, but still supported):
  - `npm run test --workspace @dxta/crawl-functions -- --runTestsByPath src/some.test.ts`

## Stack App (SST)

Located at `apps/stack`.

- Dev: `npm run dev --workspace @dxta/stack`
- Build: `npm run build --workspace @dxta/stack`
- Deploy: `npm run deploy --workspace @dxta/stack`
- Remove: `npm run remove --workspace @dxta/stack`
- Console: `npm run console --workspace @dxta/stack`

## Formatting and Linting Rules

ESLint config: `packages/config/eslint/index.js` and `.eslintrc.js`.
Prettier config: `prettier.config.cjs`.

Key ESLint rules:

- TypeScript rules enabled with type-aware linting.
- `@typescript-eslint/consistent-type-imports`: enforce `import type`.
- `@typescript-eslint/no-unused-vars`: unused ok if prefixed `_`.
- `@typescript-eslint/restrict-template-expressions`: off.

Prettier defaults (selected):

- `printWidth`: 80
- `semi`: true
- `singleQuote`: false
- `trailingComma`: all
- `tabWidth`: 2
- Import sorting via `@ianvs/prettier-plugin-sort-imports`.

Import order (from `prettier.config.cjs`):

1. React / React Native
2. Next.js
3. Expo
4. Third-party modules
5. Blank line
6. `@dxta/*`
7. Blank line
8. `~/utils`, `~/components`, `~/styles`, `~/...`
9. Relative imports

## TypeScript Conventions

Global TS settings are strict (`strict: true`) with:

- `noUncheckedIndexedAccess: true`
- `skipLibCheck: true`
- `esModuleInterop: true`
- `resolveJsonModule: true`
- `isolatedModules: true`

Guidelines:

- Prefer explicit types for exported functions, public APIs, and complex objects.
- Use `import type` for types; follow ESLint rule.
- Keep nullability explicit; avoid `any`.
- Use `readonly` or `as const` when values are intended immutable.

## Naming Conventions

Observed patterns in the codebase:

- Files: `kebab-case` for most modules (e.g. `merge-request-diffs.ts`).
- Functions: `camelCase` with verb-first naming.
- Types/Interfaces: `PascalCase`.
- Constants: `camelCase` for values, `UPPER_SNAKE_CASE` for env keys.

## Error Handling

- Prefer explicit error types when throwing (e.g. custom errors in integrations).
- Surface errors with context (ids, URLs, provider name).
- Avoid swallowing errors unless handling retries/backoffs explicitly.
- For external calls, consider rate limit behavior (see source-control package).

## Code Organization

- Schemas live in `packages/schemas/*`.
- Shared functions live in `packages/functions/*`.
- Integrations live in `packages/integrations/*`.
- SST app lives in `apps/stack`.

## Tests

- Jest config is minimal (`preset: ts-jest`, `testEnvironment: node`).
- Keep tests co-located with module files as `*.test.ts`.
- Prefer deterministic tests without network access.

## Lint/Format Workflow

- Run `npm run lint` and `npm run format` before PRs.
- Use `npm run lint:fix` to auto-fix when possible.
- Formatting uses Prettier; avoid manual reformatting.

## Cursor/Copilot Rules

- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` were found.

## Notes for Agents

- Do not modify generated files unless required by task.
- Respect the existing import order and formatting.
- Use workspace scripts for package-specific tasks.
- If a workspace has no tests, keep `test` output as-is.
