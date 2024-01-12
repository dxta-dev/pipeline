import type { Config } from 'drizzle-kit';

// deprecated since [TOOL-189]
export default {
  schema: "./src/index.ts",
  out: "../../../migrations/super",
} satisfies Config;
