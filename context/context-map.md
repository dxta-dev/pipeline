# Context Map

- `context/overview.md`
- `context/glossary.md`
- `context/patterns.md`
- `context/functions/packages-functions.md`
- `context/functions/crawl-functions.md`
- `context/functions/extract-functions.md`
- `context/functions/transform-functions.md`
- `context/functions/tenant-activities.md`
- `context/integrations/source-control.md`
- `context/integrations/github-source-control.md`
- `context/tooling/monorepo-commands.md`
- `context/tooling/local-dev.md`
- `context/tooling/docker-images.md`
- `context/tooling/migrations.md`
- `context/tooling/scripts.md`
- `context/observability/package.md`
- `context/temporal/baseline-design.md`
- `context/temporal/railway-images.md`
- `context/temporal/extract-worker.md`
- `context/temporal/transform-worker.md`
- `context/temporal/orchestrator.md`
- `context/temporal/basic-auth-proxy.md`

## Invariants
- Every context file covers one topic and stays under 250 lines.

## Contracts
- All new context files must be added to this map.

## Rationale
- A single index keeps discovery consistent across sessions.

## Lessons
- Update the map before adding new domain folders.

## Related

- [Overview](overview.md)
- [Functions domain](functions/packages-functions.md)
- [Source control integration](integrations/source-control.md)
- [GitHub source control](integrations/github-source-control.md)
- [Monorepo commands](tooling/monorepo-commands.md)
- [Tooling scripts](tooling/scripts.md)
- [Temporal baseline design](temporal/baseline-design.md)
- [Extract worker](temporal/extract-worker.md)
- [Transform worker](temporal/transform-worker.md)
- [Orchestrator](temporal/orchestrator.md)
- [Basic auth proxy](temporal/basic-auth-proxy.md)
