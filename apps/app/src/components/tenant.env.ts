import { z } from "zod";

const ENVSchema = z.object({
  TENANTS: z.string(),
})
const TenantSchema = z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
});
const TenantArraySchema = z.array(TenantSchema);

const processEnv = () => {
  const validEnv = ENVSchema.safeParse(process.env);
  if (!validEnv.success) {
    console.error(`Missing required environment variable 'TENANT'`);
    return undefined;
  }

  const validTenantArray = TenantArraySchema.safeParse(JSON.parse(validEnv.data.TENANTS));
  if (!validTenantArray.success) {
    console.error("Invalid environment variable 'TENANTS' value:", ...validTenantArray.error.issues);
    return undefined;
  }

  return validTenantArray.data;  
}

const TENANTS = processEnv();


export const getEnvTenants = () => TENANTS;

export type Tenant = z.infer<typeof TenantSchema>;
