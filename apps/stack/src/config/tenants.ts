import { z } from "zod";

const TenantSchema = z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
});

const TenantArraySchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;

const ENVSchema = z.object({
  TENANTS: z.string()
})

const validEnv = ENVSchema.safeParse(process.env);

export const getTenants = () => {
  if (!validEnv.success) {
    console.error("Invalid environment variable 'TENANTS' value:", ...validEnv.error.issues);
    throw new Error("Invalid environment variable 'TENANTS' value");
  }

  const validTenants = TenantArraySchema.safeParse(JSON.parse(validEnv.data.TENANTS));
  if (!validTenants.success) {
    console.error("Invalid environment variable 'TENANTS' value:", ...validTenants.error.issues);
    throw new Error("Invalid environment variable 'TENANTS' value");
  }

  return validTenants.data;
}
