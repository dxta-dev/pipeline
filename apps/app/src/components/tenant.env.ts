import { z } from "zod";

const ENVSchema = z.object({
  TENANTS: z.string(),
})
const TenancyArraySchema = z.array(z.object({
  id: z.number(),
  tenant: z.string(),
  dbUrl: z.string(),
}));


const loadTenants = ()=> {
  const validEnv = ENVSchema.safeParse(process.env);
  if (!validEnv.success) {
    console.error(`Missing required environment variable 'TENANT'`);
    return undefined;
  }

  const validTenants = TenancyArraySchema.safeParse(JSON.parse(validEnv.data.TENANTS));
  if (!validTenants.success) {
    console.error("Invalid environment variable 'TENANTS' value:", ...validTenants.error.issues);
    return undefined;
  }

  return validTenants.data;  
}

export type Tenant = z.infer<typeof TenancyArraySchema.element>;
export const TENANTS = loadTenants();