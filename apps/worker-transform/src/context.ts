import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getEnv } from "./env";

export function initDatabase(dbUrl: string) {
  return drizzle(
    createClient({
      url: dbUrl,
      authToken: getEnv().TENANT_DATABASE_AUTH_TOKEN,
    }),
  );
}

export function initSuperDatabase() {
  const env = getEnv();
  return drizzle(
    createClient({
      url: env.SUPER_DATABASE_URL,
      authToken: env.SUPER_DATABASE_AUTH_TOKEN,
    }),
  );
}
