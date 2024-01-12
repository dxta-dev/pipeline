import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { getTenants } from "./tenants";
import type { Tenant } from "@acme/super-schema";

export type OmitDb<T> = Omit<T, 'db'>;

export const getTenantDb = (tenantId: Tenant['id']) => {

  const validTenants = getTenants();

  const url = validTenants.find(t => t.id === tenantId)?.dbUrl;
  if (!url) { 
    throw new Error(`Couldn't resolve tenant database. Invalid tenantId: ${tenantId}`); 
  }

  return drizzle(createClient({ url, authToken: Config.TENANT_DATABASE_AUTH_TOKEN }));
}
