# Scripts

## seed-schema.ts

Seeds the tenant database with dimension tables (dates, null rows, etc.).

### Usage

```bash
npx tsx scripts/seed-schema.ts --url <TENANT_DATABASE_URL> --authToken <AUTH_TOKEN>
```

### Arguments

| Argument      | Short | Required | Description                    |
| ------------- | ----- | -------- | ------------------------------ |
| `--url`       | `-u`  | Yes      | Tenant database URL            |
| `--authToken` | `-t`  | No       | Auth token for the database    |

### Example

```bash
npx tsx scripts/seed-schema.ts -u "libsql://tenant-db.turso.io" -t "your-auth-token"
```
