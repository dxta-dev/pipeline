import { getTenants } from "@acme/super-schema";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { AppConfig } from "src/app-config";

const loadTenants = async ()=> {
  const superDb = drizzle(createClient(AppConfig.superDatabase));
  
  const tenants = await getTenants(superDb);

  return tenants;
}
const TENANT_LIST = await loadTenants();

export const tenantListContext = () => ({
  tenantList: TENANT_LIST
})
