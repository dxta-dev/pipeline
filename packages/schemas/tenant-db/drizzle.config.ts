import type { Config } from 'drizzle-kit';

export default {
  schema: "./src/index.ts",
  out: "../../../migrations/tenant-db",
} satisfies Config;
