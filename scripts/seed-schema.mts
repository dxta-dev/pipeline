import { parseArgs } from "node:util";
import { seed } from "@dxta/transform-schema/src/seed/dimensions";
import { createClient } from "@libsql/client";
import type { Config } from "@libsql/core/api";
import { drizzle } from "drizzle-orm/libsql";

async function seedSchema(config: Config) {
  const today = new Date();

  const from = new Date();
  from.setFullYear(today.getFullYear() - 5);
  const to = new Date();
  to.setFullYear(today.getFullYear() + 5);

  const instance = createClient(config);
  const db = drizzle(instance);

  console.log(
    `Seeding SCHEMA-DB from ${from.toISOString()} to ${to.toISOString()}`,
  );

  await seed(db as any, from, to);
}

const { values } = parseArgs({
  options: {
    url: {
      type: "string",
      short: "u",
    },
    authToken: {
      type: "string",
      short: "t",
    },
  },
});

if (!values.url) {
  console.error("Missing required argument: --url (-u)");
  process.exit(1);
}

const schemaConfig = {
  url: values.url,
  authToken: values.authToken,
} satisfies Config;

await seedSchema(schemaConfig);
