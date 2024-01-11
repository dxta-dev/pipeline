import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { getTenants as getTenantsFromDb } from "@acme/meta-schema";

const metaDb = drizzle(createClient({ url: Config.META_DATABASE_URL, authToken: Config.META_DATABASE_AUTH_TOKEN }))

const TENANTS = await getTenantsFromDb(metaDb);

export const getTenants = () => TENANTS;
