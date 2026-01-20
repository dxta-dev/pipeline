import { z } from "zod";

const envSchema = z.object({
  TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
  TEMPORAL_NAMESPACE: z.string().default("default"),
  TENANT_DATABASE_AUTH_TOKEN: z.string(),
  SUPER_DATABASE_URL: z.string(),
  SUPER_DATABASE_AUTH_TOKEN: z.string(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
