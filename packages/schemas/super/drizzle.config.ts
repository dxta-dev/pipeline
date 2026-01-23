import { defineConfig } from "drizzle-kit";

// deprecated since [TOOL-189]
export default defineConfig({
  schema: "./src/index.ts",
  out: "../../../migrations/super",
  dialect: "sqlite",
});
