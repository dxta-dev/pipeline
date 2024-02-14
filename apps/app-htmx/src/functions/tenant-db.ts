import type { Tenant } from "@dxta/super-schema";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { AppConfig } from "src/app-config";

export const tenantDb = (tenant:Tenant)=> {
  const client = createClient({
    url: tenant.dbUrl,
    authToken: AppConfig.tenantDatabaseAuthToken
  });
  return drizzle(client);
}