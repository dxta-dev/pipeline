import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";

type initDatabaseInput = { dbUrl: string };
export const initDatabase = ({ dbUrl }: initDatabaseInput) => drizzle(createClient({
  url: dbUrl,
  authToken: Config.TENANT_DATABASE_AUTH_TOKEN,
}));