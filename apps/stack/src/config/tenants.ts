import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { getTenants as getTenantsFromDb } from "@dxta/super-schema";

const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }))

const TENANTS = await getTenantsFromDb(superDb);

export const getTenants = () => TENANTS;
