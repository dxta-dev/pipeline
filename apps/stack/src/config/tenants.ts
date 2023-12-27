import { Config } from "sst/node/config";
import { z } from "zod";

const TenantSchema = z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
});

const TenantArraySchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;

export const getTenants = () => {
  const validTenants = TenantArraySchema.safeParse(JSON.parse(Config.TENANTS));
  if (!validTenants.success) {
    console.error("Invalid Config 'TENANTS' value:", ...validTenants.error.issues);
    throw new Error("Invalid Config 'TENANTS' value");
  }

  return validTenants.data;
}
