import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { z } from "zod";

export type OmitDb<T> = Omit<T, 'db'>;

const TenancyArraySchema = z.array(z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
}));
export const TenantSchema = TenancyArraySchema.element;
export type Tenancy = z.infer<typeof TenancyArraySchema.element>
const ENVSchema = z.object({
  TENANTS: z.string()
})

let TENANCY_MAP: Map<Tenancy['id'], Tenancy['dbUrl']> | undefined;
const lazyloadTenancyMap = () => {
  if (TENANCY_MAP) return TENANCY_MAP;
  
  const validEnv = ENVSchema.safeParse(process.env);
  if (!validEnv.success) {
    const error = new Error("Missing required environment variable 'TENANTS'")
    console.error(error.toString());
    throw error;
  }

  const validTenants = TenancyArraySchema.safeParse(JSON.parse(validEnv.data.TENANTS));
  if (!validTenants.success) {
    console.log("Invalid environment variable 'TENANTS' value:", ...validTenants.error.issues);
    throw new Error("Invalid environment variable 'TENANTS' value");
  }

  TENANCY_MAP = new Map(validTenants.data.map(tenant => [tenant.id, tenant.dbUrl]));
  return TENANCY_MAP;
}

const tenantDbMap = new Map<Tenancy['id'], LibSQLDatabase<Record<string,never>>>();
export const resolveTenantDb = (tenantId: Tenancy['id']) => {
  const resolvedDb = tenantDbMap.get(tenantId);
  if (resolvedDb) return resolvedDb;

  const url = lazyloadTenancyMap().get(tenantId);
  if (!url) { throw new Error(`Couldn't resolve tenant database. Invalid tenantId: ${tenantId}`); }

  const tenantDb = drizzle(createClient({ url, authToken: process.env.TENANT_DATABASE_AUTH_TOKEN }));
  tenantDbMap.set(tenantId, tenantDb);
  return tenantDb;
}