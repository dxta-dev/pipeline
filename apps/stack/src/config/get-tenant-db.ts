import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { z } from "zod";

export type OmitDb<T> = Omit<T, 'db'>;

const TenantSchema = z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
});

const TenancyArraySchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;

const ENVSchema = z.object({
  TENANTS: z.string()
})

const validEnv = ENVSchema.safeParse(process.env);

export const getTenants = () => {
  if (!validEnv.success) {
    console.log("Invalid environment variable 'TENANTS' value:", ...validEnv.error.issues);
    throw new Error("Invalid environment variable 'TENANTS' value");
  }

  const validTenants = TenancyArraySchema.safeParse(JSON.parse(validEnv.data.TENANTS));
  if (!validTenants.success) {
    console.log("Invalid environment variable 'TENANTS' value:", ...validTenants.error.issues);
    throw new Error("Invalid environment variable 'TENANTS' value");
  }

  return validTenants.data;
}

export const getTenantDb = (tenantId: Tenant['id']) => {

  const validTenants = getTenants();

  const url = validTenants.find(t => t.id === tenantId)?.dbUrl;
  if (!url) { 
    throw new Error(`Couldn't resolve tenant database. Invalid tenantId: ${tenantId}`); 
  }

  return drizzle(createClient({ url, authToken: Config.TENANT_DATABASE_AUTH_TOKEN }));
}
