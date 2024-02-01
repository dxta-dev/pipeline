import { z } from "zod"

const ENVSchema = z.object({
  SUPER_DATABASE_URL: z.string(),
  SUPER_DATABASE_AUTH_TOKEN: z.string().optional(),
  TENANT_DATABASE_AUTH_TOKEN: z.string().optional(),

  // TODO: remove after removing next
  NEXT_PUBLIC_EXTRACT_API_URL: z.string(),
  NEXT_PUBLIC_TRANSFORM_API_URL: z.string(),

  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_DOMAIN: z.string(),
});

const parsedEnv = ENVSchema.safeParse(process.env);
if (!parsedEnv.success) throw new Error(`Invalid environment: ${parsedEnv.error}`);

export const AppConfig = {
  superDatabase: {
    url: parsedEnv.data.SUPER_DATABASE_URL,
    authToken: parsedEnv.data.SUPER_DATABASE_AUTH_TOKEN,
  },
  tenantDatabaseAuthToken: parsedEnv.data.TENANT_DATABASE_AUTH_TOKEN,
  apis: {
    extractStart: parsedEnv.data.NEXT_PUBLIC_EXTRACT_API_URL,
    transformStart: parsedEnv.data.NEXT_PUBLIC_TRANSFORM_API_URL,
  },
  clerk: {
    domain: parsedEnv.data.CLERK_DOMAIN,
    publishableKey: parsedEnv.data.CLERK_PUBLISHABLE_KEY,
    secretKey: "", // should be left in ENV
  }
}