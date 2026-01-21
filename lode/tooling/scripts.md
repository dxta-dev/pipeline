# Scripts

Project maintenance and database scripts available in the monorepo.

## Seed Schema

Seeds dimension tables (dates, times, forge users) in a tenant database. Required before running extract/transform pipelines.

### Usage

```bash
pnpm tsx scripts/seed-schema.mts -u "<DATABASE_URL>" -t "<AUTH_TOKEN>"
```

### Arguments

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `-u, --url` | string | required | LibSQL database URL |
| `-t, --authToken` | string | optional | Database auth token |

### Behavior

Seeds data for a 10-year range (5 years before and after the current date).

## Related

- [Monorepo commands](monorepo-commands.md)
- [Database migrations](migrations.md)
- [Local development](local-dev.md)
