import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/index.ts",
  out: "../../../migrations/combined",
  dialect: "sqlite",
});
